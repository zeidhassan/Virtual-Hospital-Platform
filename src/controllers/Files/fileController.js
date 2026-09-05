const path = require('path');
const fs = require('fs');
const pool = require('../../config/db');

// Resolves filename against baseDir, stripping any directory components first
// so a path-traversal payload (`..%2F..%2Fsrc%2Fconfig%2Fdb.js`) can never
// escape the intended upload folder — path.basename() removes every
// separator before the containment check even runs.
function resolveSafePath(baseDir, filename) {
  const safeName = path.basename(filename || '');
  const abs = path.resolve(baseDir, safeName);
  if (!safeName || !abs.startsWith(baseDir + path.sep)) return null;
  return { abs, safeName };
}

async function getOwnProfileId(userId, role) {
  const table = role === 'doctor' ? 'doctors' : 'patients';
  const r = await pool.query(`SELECT id FROM ${table} WHERE user_id = $1`, [userId]);
  return r.rows[0]?.id ?? null;
}

async function doctorLinkedToPatient(doctorId, patientId) {
  const r = await pool.query(
    'SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1',
    [doctorId, patientId]
  );
  return r.rows.length > 0;
}

function sendFile(res, abs, safeName) {
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'File not found.' });
  res.setHeader('Content-Disposition', `attachment; filename="${safeName.replace(/"/g, '')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(abs);
}

// GET /api/files/prescriptions/:filename — pharmacy-order prescription uploads
exports.getPrescriptionFile = async (req, res) => {
  const baseDir = path.join(__dirname, '../../../uploads/prescriptions');
  const resolved = resolveSafePath(baseDir, req.params.filename);
  if (!resolved) return res.status(400).json({ error: 'Invalid filename.' });
  const { abs, safeName } = resolved;

  try {
    const orderRes = await pool.query(
      'SELECT patient_id FROM pharmacy_orders WHERE prescription_file = $1',
      [`uploads/prescriptions/${safeName}`]
    );
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'File not found.' });
    const { patient_id: patientId } = orderRes.rows[0];

    const { role, id: userId } = req.user;
    let allowed = role === 'admin';
    if (!allowed && role === 'patient') {
      const ownPatientId = await getOwnProfileId(userId, 'patient');
      allowed = ownPatientId !== null && ownPatientId === patientId;
    }
    if (!allowed && role === 'doctor') {
      const ownDoctorId = await getOwnProfileId(userId, 'doctor');
      allowed = ownDoctorId !== null && await doctorLinkedToPatient(ownDoctorId, patientId);
    }
    if (!allowed) return res.status(404).json({ error: 'File not found.' });

    sendFile(res, abs, safeName);
  } catch (err) {
    console.error('[Files] getPrescriptionFile error:', err);
    res.status(500).json({ error: 'Failed to retrieve file.' });
  }
};

// GET /api/files/medical-records/:filename
exports.getMedicalRecordFile = async (req, res) => {
  const baseDir = path.join(__dirname, '../../../uploads/medical-records');
  const resolved = resolveSafePath(baseDir, req.params.filename);
  if (!resolved) return res.status(400).json({ error: 'Invalid filename.' });
  const { abs, safeName } = resolved;

  try {
    const recordRes = await pool.query(
      'SELECT patient_id FROM medical_records WHERE file_url = $1',
      [`uploads/medical-records/${safeName}`]
    );
    if (recordRes.rows.length === 0) return res.status(404).json({ error: 'File not found.' });
    const { patient_id: patientId } = recordRes.rows[0];

    const { role, id: userId } = req.user;
    let allowed = role === 'admin';
    if (!allowed && role === 'patient') {
      const ownPatientId = await getOwnProfileId(userId, 'patient');
      allowed = ownPatientId !== null && ownPatientId === patientId;
    }
    if (!allowed && role === 'doctor') {
      const ownDoctorId = await getOwnProfileId(userId, 'doctor');
      allowed = ownDoctorId !== null && await doctorLinkedToPatient(ownDoctorId, patientId);
    }
    if (!allowed) return res.status(404).json({ error: 'File not found.' });

    sendFile(res, abs, safeName);
  } catch (err) {
    console.error('[Files] getMedicalRecordFile error:', err);
    res.status(500).json({ error: 'Failed to retrieve file.' });
  }
};

// GET /api/files/support-tickets/:filename — ticket attachments and reply attachments
exports.getSupportTicketFile = async (req, res) => {
  const baseDir = path.join(__dirname, '../../../uploads/support-tickets');
  const resolved = resolveSafePath(baseDir, req.params.filename);
  if (!resolved) return res.status(400).json({ error: 'Invalid filename.' });
  const { abs, safeName } = resolved;
  const storedPath = `uploads/support-tickets/${safeName}`;

  try {
    let ticket = null;

    const ticketRes = await pool.query(
      'SELECT user_id, doctor_assigned, patient_assigned FROM support_tickets WHERE file_url = $1',
      [storedPath]
    );
    if (ticketRes.rows.length > 0) {
      ticket = ticketRes.rows[0];
    } else {
      const replyRes = await pool.query(
        `SELECT t.user_id, t.doctor_assigned, t.patient_assigned
         FROM support_ticket_replies r
         JOIN support_tickets t ON r.ticket_id = t.id
         WHERE r.file_url = $1`,
        [storedPath]
      );
      if (replyRes.rows.length > 0) ticket = replyRes.rows[0];
    }

    if (!ticket) return res.status(404).json({ error: 'File not found.' });

    const { role, id: userId } = req.user;
    let allowed = role === 'admin' || ticket.user_id === userId;
    if (!allowed && role === 'doctor') {
      const ownDoctorId = await getOwnProfileId(userId, 'doctor');
      allowed = ownDoctorId !== null && ownDoctorId === ticket.doctor_assigned;
    }
    if (!allowed && role === 'patient') {
      const ownPatientId = await getOwnProfileId(userId, 'patient');
      allowed = ownPatientId !== null && ownPatientId === ticket.patient_assigned;
    }
    if (!allowed) return res.status(404).json({ error: 'File not found.' });

    sendFile(res, abs, safeName);
  } catch (err) {
    console.error('[Files] getSupportTicketFile error:', err);
    res.status(500).json({ error: 'Failed to retrieve file.' });
  }
};

// GET /api/files/messages/:filename — chat attachments
exports.getMessageAttachmentFile = async (req, res) => {
  const baseDir = path.join(__dirname, '../../../uploads/messages');
  const resolved = resolveSafePath(baseDir, req.params.filename);
  if (!resolved) return res.status(400).json({ error: 'Invalid filename.' });
  const { abs, safeName } = resolved;

  try {
    const msgRes = await pool.query(
      'SELECT conversation_id FROM messages WHERE attachment_url = $1',
      [`uploads/messages/${safeName}`]
    );
    if (msgRes.rows.length === 0) return res.status(404).json({ error: 'File not found.' });
    const { conversation_id: conversationId } = msgRes.rows[0];

    const { role, id: userId } = req.user;
    let allowed = role === 'admin';
    if (!allowed) {
      const participantRes = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      allowed = participantRes.rows.length > 0;
    }
    if (!allowed) return res.status(404).json({ error: 'File not found.' });

    sendFile(res, abs, safeName);
  } catch (err) {
    console.error('[Files] getMessageAttachmentFile error:', err);
    res.status(500).json({ error: 'Failed to retrieve file.' });
  }
};
