// src/controllers/supportTicketsController.js
// Supports: patients, doctors, admins
// Tables used:
//   support_tickets(id, user_id, category, subject, description, status, file_url, doctor_assigned, patient_assigned, created_at, updated_at)
//   support_ticket_replies(id, ticket_id, user_id, message, file_url, created_at)
//   users(id, full_name, ...)
//   doctors(id, user_id, ...)
//   patients(id, user_id, ...)
//   notifications(id, user_id, title, message, type, created_at)   <-- optional (best effort)

const pool = require('../../config/db');
const paginate = require('../../utils/pagination');

// ---------- Config / Validation ----------
const STATUS = ['pending', 'open', 'in progress', 'resolved', 'closed'];
// If you don’t want “pending”, remove it. Default used below is "open".
const CATEGORY = ['Technical', 'Medical', 'Billing', 'Appointments', 'Other'];
const SORTABLE = new Set(['id', 'user_id', 'subject', 'description', 'status', 'category', 'created_at', 'updated_at']);

const toInt = (v, d = null) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

function assertStatusAllowed(s) {
  if (!STATUS.includes(s)) {
    const e = new Error(`Invalid status. Allowed: ${STATUS.join(', ')}`);
    e.code = 400; throw e;
  }
}
function assertCategoryAllowed(c) {
  if (c && !CATEGORY.includes(c)) {
    const e = new Error(`Invalid category. Allowed: ${CATEGORY.join(', ')}`);
    e.code = 400; throw e;
  }
}
function assertNonEmpty(v, field, min = 1, max = null) {
  const s = (v ?? '').toString().trim();
  if (s.length < min) {
    const e = new Error(`${field} is required and must be at least ${min} characters.`);
    e.code = 400; throw e;
  }
  if (max && s.length > max) {
    const e = new Error(`${field} must be at most ${max} characters.`);
    e.code = 400; throw e;
  }
  return s;
}
function normalizeSort(sort) {
  if (!sort) return '-created_at'; // default newest first
  const s = String(sort).trim();
  const dir = s.startsWith('-') ? 'DESC' : 'ASC';
  const col = s.replace(/^[-+]/, '');
  if (!SORTABLE.has(col)) return '-created_at';
  return (dir === 'DESC') ? `-${col}` : `+${col}`;
}

// ---------- Helpers (IDs, tickets, notifications) ----------
async function getPatientIdByUser(userId) {
  const { rows } = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return rows[0]?.id || null;
}
async function getDoctorIdByUser(userId) {
  const { rows } = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
  return rows[0]?.id || null;
}
async function getDoctorUserId(doctorId) {
  if (!doctorId) return null;
  const { rows } = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [doctorId]);
  return rows[0]?.user_id || null;
}
async function getPatientUserId(patientId) {
  if (!patientId) return null;
  const { rows } = await pool.query('SELECT user_id FROM patients WHERE id = $1', [patientId]);
  return rows[0]?.user_id || null;
}
async function getTicketById(ticketId) {
  const { rows } = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
  return rows[0] || null;
}
// Best-effort notifications (ignored if table/columns differ)
async function notifyUsers(userIds, title, message, category = 'support') {
  if (!userIds?.length) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const uid of userIds.filter(Boolean)) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, category, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [uid, title, message, category]
      );
    }
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK'); // silently ignore notification failures
  } finally {
    client.release();
  }
}

// ---------- LIST: only tickets ASSIGNED to the caller ----------
exports.getAllDoctorTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const doctorId = await getDoctorIdByUser(userId);
    if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found.' });

    const filters = {
      'st.doctor_assigned': doctorId,
      'st.status': req.query.status || undefined,
      'st.category': req.query.category || undefined,
      'st.subject': req.query.subject || undefined,       // LIKE (handled by your paginate)
      'st.description': req.query.description || undefined
    };

    const result = await paginate({
      table: 'support_tickets st',
      sortTable: 'st',
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sort: normalizeSort(req.query.sort), // e.g., -created_at
      select: `
        st.id, st.user_id, st.category, st.subject, st.description, st.status, st.file_url,
        st.doctor_assigned, st.patient_assigned, st.created_at, st.updated_at
      `,
      join: `
        LEFT JOIN doctors d ON d.id = st.doctor_assigned
        LEFT JOIN patients p ON p.id = st.patient_assigned
      `,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('[getAllDoctorTickets] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

exports.getAllPatientTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = await getPatientIdByUser(userId);
    if (!patientId) return res.status(404).json({ error: 'Patient profile not found.' });

    const filters = {
      'st.patient_assigned': patientId,
      'st.status': req.query.status || undefined,
      'st.category': req.query.category || undefined,
      'st.subject': req.query.subject || undefined,       // LIKE
      'st.description': req.query.description || undefined
    };

    const result = await paginate({
      table: 'support_tickets st',
      sortTable: 'st',
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sort: normalizeSort(req.query.sort),
      select: `
        st.id, st.user_id, st.category, st.subject, st.description, st.status, st.file_url,
        st.doctor_assigned, st.patient_assigned, st.created_at, st.updated_at
      `,
      join: `
        LEFT JOIN doctors d ON d.id = st.doctor_assigned
        LEFT JOIN patients p ON p.id = st.patient_assigned
      `,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('[getAllPatientTickets] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

// ---------- LIST: Admin sees everything ----------
exports.getAllAdminTickets = async (req, res) => {
  try {
    const filters = {
      'st.status': req.query.status || undefined,
      'st.category': req.query.category || undefined,
      'st.user_id': req.query.user_id || undefined,
      'st.doctor_assigned': req.query.doctor_assigned || undefined,
      'st.patient_assigned': req.query.patient_assigned || undefined,
      'st.subject': req.query.subject || undefined,
      'st.description': req.query.description || undefined
    };

    const result = await paginate({
      table: 'support_tickets st',
      sortTable: 'st',
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      sort: normalizeSort(req.query.sort),
      select: `
        st.*,
        u.full_name AS creator_name,
        d_user.full_name AS doctor_name,
        p_user.full_name AS patient_name,
        (
          EXISTS (
            SELECT 1 FROM support_ticket_replies r
            LEFT JOIN users ru ON ru.id = r.user_id
            WHERE r.ticket_id = st.id
              AND (ru.role IS DISTINCT FROM 'admin')
              AND r.created_at > COALESCE(st.admin_read_at, '-infinity'::timestamp)
          )
          OR (
            st.admin_read_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM support_ticket_replies WHERE ticket_id = st.id)
          )
        ) AS has_unread
      `,
      join: `
        LEFT JOIN users u ON u.id = st.user_id
        LEFT JOIN doctors d ON d.id = st.doctor_assigned
        LEFT JOIN users d_user ON d.user_id = d_user.id
        LEFT JOIN patients p ON p.id = st.patient_assigned
        LEFT JOIN users p_user ON p.user_id = p_user.id
      `,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('[getAllAdminTickets] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

// ---------- CREATE (patient / doctor / admin) ----------
async function createTicketInternal(creatorUserId, body) {
  const category = body.category || 'Other';
  assertCategoryAllowed(category);
  const subject = assertNonEmpty(body.subject, 'Subject', 3, 100);
  const description = assertNonEmpty(body.description, 'Description', 5, null);
  const file_url = (body.file_url || null);

  // default status per your flow: Open
  let status = (body.status || 'open').trim();
  assertStatusAllowed(status);

  // Assignment (admin can assign; creators are auto-linked to their role entity)
  let doctor_assigned = body.doctor_assigned ? toInt(body.doctor_assigned) : null;
  let patient_assigned = body.patient_assigned ? toInt(body.patient_assigned) : null;

  // Auto fill if creator is a patient/doctor:
  const myDoctorId = await getDoctorIdByUser(creatorUserId);
  const myPatientId = await getPatientIdByUser(creatorUserId);
  if (myDoctorId && !doctor_assigned) doctor_assigned = myDoctorId;
  if (myPatientId && !patient_assigned) patient_assigned = myPatientId;

  const { rows } = await pool.query(
    `INSERT INTO support_tickets
      (user_id, category, subject, description, status, file_url, doctor_assigned, patient_assigned, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [creatorUserId, category, subject, description, status, file_url, doctor_assigned, patient_assigned]
  );
  return rows[0];
}

// Patient creates (now supports multipart upload via req.file)
exports.patientCreateTicket = async (req, res) => {
  try {
    const pid = await getPatientIdByUser(req.user.id);
    if (!pid) return res.status(403).json({ error: 'Only patients can create here.' });

    // If multer saved a file, store a web path; otherwise fall back to body.file_url
    const uploadedPath = req.file ? `/uploads/support-tickets/${req.file.filename}` : (req.body.file_url || null);

    // Patients cannot assign others during creation; auto-link their patient id
    const body = {
      ...req.body,
      file_url: uploadedPath,
      doctor_assigned: null,
      patient_assigned: pid
    };

    const ticket = await createTicketInternal(req.user.id, body);
    res.status(201).json(ticket);
  } catch (err) {
    console.error('[patientCreateTicket] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

// Doctor creates (now supports multipart upload via req.file)
exports.doctorCreateTicket = async (req, res) => {
  try {
    const did = await getDoctorIdByUser(req.user.id);
    if (!did) return res.status(403).json({ error: 'Only doctors can create here.' });

    const uploadedPath = req.file ? `/uploads/support-tickets/${req.file.filename}` : (req.body.file_url || null);

    // Doctors cannot assign a patient during creation (besides themselves via auto-link)
    const body = {
      ...req.body,
      file_url: uploadedPath,
      doctor_assigned: did,
      patient_assigned: null
    };

    const ticket = await createTicketInternal(req.user.id, body);
    res.status(201).json(ticket);
  } catch (err) {
    console.error('[doctorCreateTicket] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

// Admin creates (optional endpoint) – also supports multipart upload via req.file
exports.adminCreateTicket = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const uploadedPath = req.file ? `/uploads/support-tickets/${req.file.filename}` : (req.body.file_url || null);

    const ticket = await createTicketInternal(req.user.id, {
      ...req.body,
      file_url: uploadedPath
      // doctor_assigned / patient_assigned can be provided in body and are validated downstream
    });
    res.status(201).json(ticket);
  } catch (err) {
    console.error('[adminCreateTicket] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

// ---------- ADMIN ASSIGN (only admins can assign to doctor/patient other than creator) ----------
exports.adminAssign = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const id = toInt(req.params.id);
    const ticket = await getTicketById(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    let { doctor_assigned, patient_assigned } = req.body;
    doctor_assigned = doctor_assigned ? toInt(doctor_assigned) : null;
    patient_assigned = patient_assigned ? toInt(patient_assigned) : null;

    const { rows } = await pool.query(
      `UPDATE support_tickets
       SET doctor_assigned = $1,
           patient_assigned = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [doctor_assigned, patient_assigned, id]
    );

    // notify participants
    const creator = ticket.user_id;
    const docUser = await getDoctorUserId(doctor_assigned);
    const patUser = await getPatientUserId(patient_assigned);
    await notifyUsers([creator, docUser, patUser].filter(u => !!u),
      'Ticket assignment updated',
      `Ticket #${id} assignment changed.`);

    res.json(rows[0]);
  } catch (err) {
    console.error('[adminAssign] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

// ---------- REPLIES (patient / doctor / admin) ----------
async function insertReply(ticketId, userId, message, fileUrl) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: r1 } = await client.query(
      `INSERT INTO support_ticket_replies (ticket_id, user_id, message, file_url, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [ticketId, userId, message, fileUrl || null]
    );
    await client.query(
      `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );
    await client.query('COMMIT');
    return r1[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
async function canReplyPatient(ticket, userId) {
  const myPatient = await getPatientIdByUser(userId);
  return ticket.user_id === userId || (!!myPatient && ticket.patient_assigned === myPatient);
}
async function canReplyDoctor(ticket, userId) {
  const myDoctor = await getDoctorIdByUser(userId);
  return ticket.user_id === userId || (!!myDoctor && ticket.doctor_assigned === myDoctor);
}

exports.patientReply = async (req, res) => {
  try {
    const ticketId = toInt(req.params.id);
    const ticket = await getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    if (!(await canReplyPatient(ticket, req.user.id))) {
      return res.status(403).json({ error: 'Not allowed to reply to this ticket.' });
    }
    const message = assertNonEmpty(req.body.message, 'Message', 2);
    const reply = await insertReply(ticketId, req.user.id, message, req.body.file_url);

    // notify other participants
    const docUser = await getDoctorUserId(ticket.doctor_assigned);
    const patUser = await getPatientUserId(ticket.patient_assigned);
    const recipients = [ticket.user_id, docUser, patUser]
      .filter(uid => uid && uid !== req.user.id);
    await notifyUsers(recipients, `New reply on Ticket #${ticketId}`, message);

    res.status(201).json(reply);
  } catch (err) {
    console.error('[patientReply] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

exports.doctorReply = async (req, res) => {
  try {
    const ticketId = toInt(req.params.id);
    const ticket = await getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    if (!(await canReplyDoctor(ticket, req.user.id))) {
      return res.status(403).json({ error: 'Not allowed to reply to this ticket.' });
    }
    const message = assertNonEmpty(req.body.message, 'Message', 2);
    const reply = await insertReply(ticketId, req.user.id, message, req.body.file_url);

    const docUser = await getDoctorUserId(ticket.doctor_assigned);
    const patUser = await getPatientUserId(ticket.patient_assigned);
    const recipients = [ticket.user_id, docUser, patUser]
      .filter(uid => uid && uid !== req.user.id);
    await notifyUsers(recipients, `New reply on Ticket #${ticketId}`, message);

    res.status(201).json(reply);
  } catch (err) {
    console.error('[doctorReply] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

exports.adminReply = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const ticketId = toInt(req.params.id);
    const ticket = await getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const message = assertNonEmpty(req.body.message, 'Message', 2);
    const reply = await insertReply(ticketId, req.user.id, message, req.body.file_url);

    const docUser = await getDoctorUserId(ticket.doctor_assigned);
    const patUser = await getPatientUserId(ticket.patient_assigned);
    const recipients = [ticket.user_id, docUser, patUser]
      .filter(uid => uid && uid !== req.user.id);
    await notifyUsers(recipients, `New reply on Ticket #${ticketId}`, message);

    res.status(201).json(reply);
  } catch (err) {
    console.error('[adminReply] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

// ---------- STATUS UPDATE ----------
exports.updateTicketStatus = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const ticket = await getTicketById(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const newStatus = assertNonEmpty(req.body.status, 'Status').toLowerCase();
    // Normalise casing for entries like "In progress"
    const canonical = STATUS.find(s => s.toLowerCase() === newStatus) || req.body.status;
    assertStatusAllowed(canonical);

    // Permissions:
    // - Admin: can set any status
    // - Assigned doctor: can move among open/in progress/resolved/closed
    // - Creator (patient/doctor/admin): can close their own ticket
    const isAdmin = req.user.role === 'admin';
    const myDoctor = await getDoctorIdByUser(req.user.id);
    const myPatient = await getPatientIdByUser(req.user.id);
    const isAssignedDoctor = !!myDoctor && ticket.doctor_assigned === myDoctor;
    const isCreator = ticket.user_id === req.user.id;

    if (!isAdmin && !isAssignedDoctor && !(isCreator && canonical === 'closed')) {
      return res.status(403).json({ error: 'Not allowed to update status for this ticket.' });
    }

    const { rows } = await pool.query(
      `UPDATE support_tickets
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [canonical, id]
    );

    // notify participants
    const docUser = await getDoctorUserId(ticket.doctor_assigned);
    const patUser = await getPatientUserId(ticket.patient_assigned);
    const recipients = [ticket.user_id, docUser, patUser]
      .filter(uid => uid && uid !== req.user.id);
    await notifyUsers(recipients, `Ticket #${id} status updated`, `New status: ${canonical}`);

    res.json(rows[0]);
  } catch (err) {
    console.error('[updateTicketStatus] Error:', err);
    res.status(err.code || 500).json({ error: err.code ? err.message : 'Something went wrong. Please try again.' });
  }
};

exports.getTicketReplies = async (req, res) => {
  try {
    const ticketId = toInt(req.params.id);
    if (!ticketId) return res.status(400).json({ error: 'Invalid ticket id.' });

    // 1) Fetch ticket & check access
    const ticket = await getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const isAdmin = req.user.role === 'admin';
    let allowed = isAdmin || ticket.user_id === req.user.id;

    if (!allowed) {
      const [myDoctorId, myPatientId] = await Promise.all([
        getDoctorIdByUser(req.user.id),
        getPatientIdByUser(req.user.id),
      ]);
      if (myDoctorId && ticket.doctor_assigned === myDoctorId) allowed = true;
      if (myPatientId && ticket.patient_assigned === myPatientId) allowed = true;
    }

    if (!allowed) return res.status(403).json({ error: 'Not allowed to view replies for this ticket.' });

    // Admin viewing the thread marks it read — the list's "unread" badge clears from here.
    if (isAdmin) {
      await pool.query('UPDATE support_tickets SET admin_read_at = NOW() WHERE id = $1', [ticketId]);
    }

    // 2) Pagination + ordering
    const page  = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(200, Math.max(1, toInt(req.query.limit, 50)));
    const offset = (page - 1) * limit;
    const order = String(req.query.order || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC'; // default ASC (oldest first)

    // 3) Query replies (joined with users to show author info)
    const [countRes, listRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM support_ticket_replies WHERE ticket_id = $1`, [ticketId]),
      pool.query(
        `SELECT r.id, r.ticket_id, r.user_id,
                u.full_name AS author_name, u.role AS author_role,
                r.message, r.file_url, r.created_at
           FROM support_ticket_replies r
           LEFT JOIN users u ON u.id = r.user_id
          WHERE r.ticket_id = $1
          ORDER BY r.created_at ${order}
          LIMIT $2 OFFSET $3`,
        [ticketId, limit, offset]
      )
    ]);

    return res.json({
      ticket_id: ticketId,
      page,
      limit,
      total: countRes.rows[0].count,
      rows: listRes.rows
    });
  } catch (err) {
    console.error('[getTicketReplies] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
