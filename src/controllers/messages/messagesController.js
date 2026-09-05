const pool = require('../../config/db');
const path = require('path');

async function getPatientIdByUser(userId) {
  const { rows } = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return rows[0]?.id || null;
}

async function getDoctorIdByUser(userId) {
  const { rows } = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
  return rows[0]?.id || null;
}

async function isUserInConversation(conversationId, userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return rows.length > 0;
}

async function canCommunicate(userId1, userId2) {
  const { rows: [u1] } = await pool.query('SELECT role FROM users WHERE id = $1', [userId1]);
  const { rows: [u2] } = await pool.query('SELECT role FROM users WHERE id = $1', [userId2]);
  if (!u1 || !u2) return false;
  if (u1.role === 'admin' || u2.role === 'admin') return true;
  if (
    (u1.role === 'patient' && u2.role === 'doctor') ||
    (u1.role === 'doctor'  && u2.role === 'patient')
  ) {
    const patientUserId = u1.role === 'patient' ? userId1 : userId2;
    const doctorUserId  = u1.role === 'doctor'  ? userId1 : userId2;
    const patientId = await getPatientIdByUser(patientUserId);
    const doctorId  = await getDoctorIdByUser(doctorUserId);
    if (!patientId || !doctorId) return false;
    const { rows } = await pool.query(
      'SELECT 1 FROM appointments WHERE patient_id = $1 AND doctor_id = $2 LIMIT 1',
      [patientId, doctorId]
    );
    return rows.length > 0;
  }
  return false;
}

async function fetchConversation(conversationId, userId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.title, c.is_group, c.created_by, c.created_at, c.updated_at,
       cp.is_pinned,
       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
       (SELECT COUNT(*) FROM messages m
        WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_id != $2
       ) AS unread_count,
       (SELECT m.message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
       (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
       (SELECT json_agg(json_build_object('user_id', u.id, 'full_name', u.full_name, 'role', u.role))
        FROM conversation_participants cp2
        INNER JOIN users u ON u.id = cp2.user_id
        WHERE cp2.conversation_id = c.id
       ) AS participants
     FROM conversations c
     INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
     WHERE c.id = $1 AND cp.user_id = $2`,
    [conversationId, userId]
  );
  return rows[0] || null;
}

exports.createConversation = async (req, res) => {
  try {
    const { participant_ids, title, is_group } = req.body;
    const creatorId   = req.user.id;
    const creatorRole = req.user.role;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return res.status(400).json({ error: 'participant_ids array is required' });
    }
    const sanitizedIds = participant_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (sanitizedIds.length !== participant_ids.length) {
      return res.status(400).json({ error: 'Invalid participant_ids' });
    }

    if (is_group) {
      if (creatorRole !== 'admin') return res.status(403).json({ error: 'Only admins can create group conversations' });
      if (sanitizedIds.length < 2) return res.status(400).json({ error: 'Group conversations require at least 2 participants' });
    } else {
      if (sanitizedIds.length !== 1) return res.status(400).json({ error: 'Direct conversations require exactly one participant' });
      const allowed = await canCommunicate(creatorId, sanitizedIds[0]);
      if (!allowed) return res.status(403).json({ error: 'You are not allowed to message this user' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (!is_group) {
        const { rows: existing } = await client.query(
          `SELECT c.id FROM conversations c
           INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
           INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
           WHERE c.is_group = FALSE AND cp1.user_id = $1 AND cp2.user_id = $2 LIMIT 1`,
          [creatorId, sanitizedIds[0]]
        );
        if (existing.length > 0) {
          await client.query('COMMIT');
          return res.status(200).json(await fetchConversation(existing[0].id, creatorId));
        }
      }

      const { rows: [conv] } = await client.query(
        `INSERT INTO conversations (title, is_group, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
        [title || null, is_group || false, creatorId]
      );

      const allParticipants = [creatorId, ...sanitizedIds.filter(id => id !== creatorId)];
      for (const uid of allParticipants) {
        await client.query(
          `INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [conv.id, uid]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(await fetchConversation(conv.id, creatorId));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[createConversation]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT c.id, c.title, c.is_group, c.created_by, c.created_at, c.updated_at,
         cp.is_pinned,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
         (SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_id != $1
         ) AS unread_count,
         (SELECT m.message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
         (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
         (SELECT json_agg(json_build_object('user_id', u.id, 'full_name', u.full_name, 'role', u.role))
          FROM conversation_participants cp2
          INNER JOIN users u ON u.id = cp2.user_id
          WHERE cp2.conversation_id = c.id
         ) AS participants
       FROM conversations c
       INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
       WHERE cp.user_id = $1
       ORDER BY cp.is_pinned DESC, c.updated_at DESC`,
      [userId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[getConversations]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (!(await isUserInConversation(conversationId, userId))) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const since  = req.query.since_id ? parseInt(req.query.since_id, 10) : null;

    const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM messages WHERE conversation_id = $1`, [conversationId]);
    const total = countRes.rows[0].count;

    // Page 1 must be the most recent `limit` messages, not the oldest — the
    // thread UI always requests page 1 with no explicit offset, so ordering
    // this ASC-from-the-start (the previous behaviour) meant any conversation
    // past `limit` messages could never show anything newer than message
    // #`limit`. Counting the offset back from the end fixes that; `since_id`
    // polling (fetching only genuinely new messages) is unaffected.
    let offset, rowLimit;
    if (since) {
      offset = 0;
      rowLimit = limit;
    } else {
      // Page N counts back from the newest message: offset is where page N
      // starts (0 if N runs past the start of the conversation), endIndex is
      // where the previous, newer page began. rowLimit is the gap between
      // them, so the oldest page comes back partial instead of overrunning
      // into messages the previous page already returned.
      offset = Math.max(0, total - page * limit);
      const endIndex = Math.max(0, total - (page - 1) * limit);
      rowLimit = Math.max(0, Math.min(limit, endIndex - offset));
    }

    const whereClause = since ? 'WHERE m.conversation_id = $1 AND m.id > $4' : 'WHERE m.conversation_id = $1';
    const params = since
      ? [conversationId, rowLimit, offset, since]
      : [conversationId, rowLimit, offset];

    const msgRes = await pool.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.message,
              m.attachment_url, m.attachment_type, m.created_at,
              u.full_name AS sender_name, u.role AS sender_role
       FROM messages m
       LEFT JOIN users u ON u.id = m.sender_id
       ${whereClause}
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      params
    );

    res.json({ conversation_id: conversationId, page, limit, total, data: msgRes.rows });
  } catch (err) {
    console.error('[getMessages]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { message } = req.body;
    const file = req.file;

    if (!message?.trim() && !file) {
      return res.status(400).json({ error: 'Message or attachment is required' });
    }

    if (!(await isUserInConversation(conversationId, userId))) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const { rows: [sender] } = await pool.query('SELECT full_name, role FROM users WHERE id = $1', [userId]);

    let attachmentUrl  = null;
    let attachmentType = null;
    if (file) {
      attachmentUrl  = `uploads/messages/${file.filename}`;
      attachmentType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
    }

    const { rows: [newMsg] } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message, attachment_url, attachment_type, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [conversationId, userId, message?.trim() || null, attachmentUrl, attachmentType]
    );

    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

    const { rows: participants } = await pool.query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
      [conversationId, userId]
    );

    const preview = message?.trim()
      ? `${sender.full_name}: ${message.trim().substring(0, 80)}${message.trim().length > 80 ? '…' : ''}`
      : `${sender.full_name} sent an attachment`;

    for (const p of participants) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, category, actor_name, actor_role, created_at)
         VALUES ($1, 'New Message', $2, 'message', $3, $4, NOW())`,
        [p.user_id, preview, sender.full_name, sender.role]
      );
    }

    res.status(201).json({ ...newMsg, sender_name: sender.full_name, sender_role: sender.role });
  } catch (err) {
    console.error('[sendMessage]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (!(await isUserInConversation(conversationId, userId))) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    await pool.query(
      'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('[markAsRead]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Marking unread rewinds this user's read pointer to before any message in the
// conversation, so the existing unread_count math (m.created_at > last_read_at)
// picks every message back up as unread without a separate is_read flag.
exports.markAsUnread = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (!(await isUserInConversation(conversationId, userId))) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    await pool.query(
      "UPDATE conversation_participants SET last_read_at = TIMESTAMP '1970-01-01' WHERE conversation_id = $1 AND user_id = $2",
      [conversationId, userId]
    );
    res.json({ message: 'Marked as unread' });
  } catch (err) {
    console.error('[markAsUnread]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.setPinned = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const pinned = !!req.body.pinned;

    if (!(await isUserInConversation(conversationId, userId))) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    await pool.query(
      'UPDATE conversation_participants SET is_pinned = $1 WHERE conversation_id = $2 AND user_id = $3',
      [pinned, conversationId, userId]
    );
    res.json({ message: pinned ? 'Pinned' : 'Unpinned', pinned });
  } catch (err) {
    console.error('[setPinned]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Only a group's creator or an admin may manage its member list — matches the
// rule that only admins can create groups in the first place.
async function canManageGroup(conversationId, userId, userRole) {
  const { rows } = await pool.query('SELECT created_by, is_group FROM conversations WHERE id = $1', [conversationId]);
  const conv = rows[0];
  if (!conv || !conv.is_group) return { ok: false, conv: null };
  if (userRole === 'admin' || conv.created_by === userId) return { ok: true, conv };
  return { ok: false, conv };
}

exports.addParticipants = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }
    const sanitizedIds = user_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (sanitizedIds.length === 0) return res.status(400).json({ error: 'Invalid user_ids' });

    const { ok, conv } = await canManageGroup(conversationId, userId, req.user.role);
    if (!conv) return res.status(404).json({ error: 'Group conversation not found' });
    if (!ok) return res.status(403).json({ error: 'Only the group creator or an admin can add members' });

    for (const uid of sanitizedIds) {
      await pool.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [conversationId, uid]
      );
    }

    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
    res.json(await fetchConversation(conversationId, userId));
  } catch (err) {
    console.error('[addParticipants]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    const userId = req.user.id;

    const { ok, conv } = await canManageGroup(conversationId, userId, req.user.role);
    if (!conv) return res.status(404).json({ error: 'Group conversation not found' });
    if (!ok) return res.status(403).json({ error: 'Only the group creator or an admin can remove members' });

    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM conversation_participants WHERE conversation_id = $1',
      [conversationId]
    );
    if (countRows[0].count <= 2) {
      return res.status(400).json({ error: 'A group must keep at least 2 members' });
    }

    const { rowCount } = await pool.query(
      'DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, targetUserId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'That user is not in this group' });

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('[removeParticipant]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAvailableContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    let contacts = [];

    if (role === 'admin') {
      const { rows } = await pool.query(
        'SELECT id, full_name, role, email FROM users WHERE id != $1 ORDER BY full_name',
        [userId]
      );
      contacts = rows;
    } else if (role === 'patient') {
      const patientId = await getPatientIdByUser(userId);
      if (patientId) {
        const { rows } = await pool.query(
          `SELECT DISTINCT u.id, u.full_name, u.role, u.email
           FROM appointments a
           INNER JOIN doctors d ON d.id = a.doctor_id
           INNER JOIN users u ON u.id = d.user_id
           WHERE a.patient_id = $1 ORDER BY u.full_name`,
          [patientId]
        );
        contacts = rows;
      }
    } else if (role === 'doctor') {
      const doctorId = await getDoctorIdByUser(userId);
      if (doctorId) {
        const { rows } = await pool.query(
          `SELECT DISTINCT u.id, u.full_name, u.role, u.email
           FROM appointments a
           INNER JOIN patients p ON p.id = a.patient_id
           INNER JOIN users u ON u.id = p.user_id
           WHERE a.doctor_id = $1 ORDER BY u.full_name`,
          [doctorId]
        );
        contacts = rows;
      }
    }

    res.json({ data: contacts });
  } catch (err) {
    console.error('[getAvailableContacts]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(
         (SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_id != $1)
       ), 0)::int AS count
       FROM conversations c
       INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
       WHERE cp.user_id = $1`,
      [userId]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error('[getUnreadCount]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
