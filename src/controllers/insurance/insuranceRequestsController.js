// src/controllers/insurance/insuranceRequestsController.js
//
// patient_id/doctor_id are patients.id/doctors.id (matching every other
// table in the schema) — not users.id.

const db = require('../../config/db');
const paginate = require('../../utils/pagination');

// Shared SELECT snippet used in several queries
const SELECT_FIELDS = `
  ir.*,
  puser.full_name AS patient_name,
  duser.full_name AS doctor_name,
  ruser.full_name AS reviewed_by_name,
  b.amount,
  b.details AS bill_description
`;

// Shared paginate() join, used by every listing below (admin/doctor/patient
// all read the same joined shape, just scoped to a different filter).
const PAGINATE_JOIN = `
  AS ir
  JOIN patients p ON ir.patient_id = p.id
  JOIN users puser ON p.user_id = puser.id
  LEFT JOIN doctors d ON ir.doctor_id = d.id
  LEFT JOIN users duser ON d.user_id = duser.id
  LEFT JOIN users ruser ON ir.reviewed_by = ruser.id
  LEFT JOIN bills b ON ir.bill_id = b.id
`;

async function resolveDoctorId(userId) {
  const r = await db.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
  return r.rows[0]?.id ?? null;
}

async function resolvePatientId(userId) {
  const r = await db.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return r.rows[0]?.id ?? null;
}

// Doctor: view all requests linked to them (all statuses)
exports.getDoctorInsuranceRequests = async (req, res) => {
  try {
    const doctorId = await resolveDoctorId(req.user.id);
    if (!doctorId) return res.status(404).json({ error: 'Doctor not found.' });

    const result = await paginate({
      table: 'insurance_requests',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-created_at',
      sortTable: 'ir',
      join: PAGINATE_JOIN,
      select: SELECT_FIELDS,
      filters: { 'ir.doctor_id': doctorId },
    });
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching doctor insurance requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Doctor or Admin: Accept a request
exports.acceptInsuranceRequest = async (req, res) => {
  const requestId = req.params.id;
  const { role, id: userId } = req.user;

  try {
    const check = await db.query(
      `SELECT doctor_id, bill_id, patient_id, insurance_company, insurance_id_number, start_date, end_date
       FROM insurance_requests WHERE id = $1`,
      [requestId]
    );
    if (check.rowCount === 0) return res.status(404).json({ error: 'Request not found.' });

    const { doctor_id, bill_id, patient_id, insurance_company, insurance_id_number, start_date, end_date } = check.rows[0];

    if (role === 'doctor') {
      const ownDoctorId = await resolveDoctorId(userId);
      if (!ownDoctorId || doctor_id !== ownDoctorId) {
        return res.status(403).json({ error: 'Forbidden: not your request.' });
      }
    }

    await db.query(
      `UPDATE insurance_requests SET status = 'accepted', reviewed_by = $1 WHERE id = $2`,
      [userId, requestId]
    );

    if (bill_id) {
      await db.query(`UPDATE bills SET status = 'paid' WHERE id = $1`, [bill_id]);
    }

    // An accepted request proves the patient's coverage — reflect it as their
    // active policy so "My Insurance" isn't stuck showing nothing.
    if (insurance_company && insurance_id_number && start_date && end_date) {
      await db.query(
        'UPDATE patient_insurance SET is_active = FALSE, updated_at = NOW() WHERE patient_id = $1 AND is_active = TRUE',
        [patient_id]
      );
      await db.query(
        `INSERT INTO patient_insurance (patient_id, insurance_company, insurance_id_number, start_date, end_date, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW())`,
        [patient_id, insurance_company, insurance_id_number, start_date, end_date]
      );
    }

    const patientUserRow = await db.query('SELECT user_id FROM patients WHERE id = $1', [patient_id]);
    if (patientUserRow.rows.length > 0) {
      await db.query(
        `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'insurance')`,
        [patientUserRow.rows[0].user_id, 'Insurance Approved', `Your insurance request #${requestId} has been approved.`]
      );
    }

    res.status(200).json({ message: 'Insurance request approved.' });
  } catch (err) {
    console.error('Error accepting insurance request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Doctor or Admin: Reject a request
exports.rejectInsuranceRequest = async (req, res) => {
  const requestId = req.params.id;
  const { role, id: userId } = req.user;
  const { rejection_message } = req.body || {};

  try {
    const check = await db.query(
      'SELECT doctor_id, bill_id, patient_id FROM insurance_requests WHERE id = $1',
      [requestId]
    );
    if (check.rowCount === 0) return res.status(404).json({ error: 'Request not found.' });

    const { doctor_id, bill_id, patient_id } = check.rows[0];

    if (role === 'doctor') {
      const ownDoctorId = await resolveDoctorId(userId);
      if (!ownDoctorId || doctor_id !== ownDoctorId) {
        return res.status(403).json({ error: 'Forbidden: not your request.' });
      }
    }

    await db.query(
      `UPDATE insurance_requests SET status = 'rejected', reviewed_by = $1 WHERE id = $2`,
      [userId, requestId]
    );

    if (bill_id) {
      await db.query(`UPDATE bills SET status = 'unpaid' WHERE id = $1`, [bill_id]);
    }

    const patientUserRow = await db.query('SELECT user_id FROM patients WHERE id = $1', [patient_id]);
    if (patientUserRow.rows.length > 0) {
      await db.query(
        `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'insurance')`,
        [patientUserRow.rows[0].user_id, 'Insurance Rejected', rejection_message || `Your insurance request #${requestId} was rejected.`]
      );
    }

    res.status(200).json({ message: 'Insurance request rejected.' });
  } catch (err) {
    console.error('Error rejecting insurance request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Patient: view own requests
exports.getMyInsuranceRequests = async (req, res) => {
  try {
    const patientId = await resolvePatientId(req.user.id);
    if (!patientId) return res.status(404).json({ error: 'Patient not found.' });

    const result = await paginate({
      table: 'insurance_requests',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-created_at',
      sortTable: 'ir',
      join: PAGINATE_JOIN,
      select: SELECT_FIELDS,
      filters: { 'ir.patient_id': patientId },
    });
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching my insurance requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Patient: submit a new insurance request
exports.submitInsuranceRequest = async (req, res) => {
  const userId = req.user.id;
  const { doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date } = req.body;

  if (!insurance_company || !insurance_id_number || !start_date || !end_date) {
    return res.status(400).json({ error: 'insurance_company, insurance_id_number, start_date, and end_date are required.' });
  }

  try {
    const patRes = await db.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    if (patRes.rows.length === 0) return res.status(403).json({ error: 'Patient record not found.' });
    const patientId = patRes.rows[0].id;

    if (bill_id) {
      const billRes = await db.query('SELECT patient_id, status FROM bills WHERE id = $1', [bill_id]);
      if (billRes.rows.length === 0) return res.status(404).json({ error: 'Bill not found.' });
      if (billRes.rows[0].patient_id !== patientId) return res.status(403).json({ error: 'Access denied.' });
      if (billRes.rows[0].status === 'paid') return res.status(400).json({ error: 'Bill already paid.' });
      if (billRes.rows[0].status === 'insurance_pending') return res.status(400).json({ error: 'An insurance request is already pending for this bill.' });
    }

    const result = await db.query(
      `INSERT INTO insurance_requests (patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [patientId, doctor_id || null, bill_id || null, insurance_company, insurance_id_number, start_date, end_date]
    );

    if (bill_id) {
      await db.query("UPDATE bills SET status = 'insurance_pending' WHERE id = $1", [bill_id]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting insurance request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: view all requests (all statuses, all patients, with or without doctor/bill)
exports.getAllInsuranceRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const result = await paginate({
      table: 'insurance_requests',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-created_at',
      sortTable: 'ir',
      join: PAGINATE_JOIN,
      select: SELECT_FIELDS,
      filters: { 'ir.status': status && status !== 'all' ? status : undefined },
    });
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching all insurance requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Patient: check for active insurance coverage
exports.getActiveInsurance = async (req, res) => {
  try {
    const patientId = await resolvePatientId(req.user.id);
    if (!patientId) return res.status(404).json({ error: 'Patient not found.' });

    const result = await db.query(
      `SELECT ir.* FROM insurance_requests ir
       WHERE ir.patient_id = $1 AND ir.status = 'accepted'
       ORDER BY ir.created_at DESC LIMIT 1`,
      [patientId]
    );
    if (result.rows.length === 0) return res.json({ hasInsurance: false, insurance: null });
    res.json({ hasInsurance: true, insurance: result.rows[0] });
  } catch (err) {
    console.error('Error checking active insurance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
