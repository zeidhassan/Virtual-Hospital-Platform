// src/controllers/insurance/insuranceRequestsController.js

const db = require('../../config/db');

// 1) Get pending insurance requests for the currently logged-in doctor
exports.getDoctorInsuranceRequests = async (req, res) => {
  const doctorId = req.user.id; // Extracted from the JWT token by middleware

  try {
    const result = await db.query(`
      SELECT 
        ir.id,
        u.full_name AS patient_name,
        b.amount,
        b.details AS description,
        ir.insurance_company,
        ir.insurance_id_number,
        ir.start_date,
        ir.end_date
      FROM insurance_requests ir
      JOIN users u ON ir.patient_id = u.id
      JOIN bills b ON ir.bill_id = b.id
      WHERE ir.status = 'pending' AND ir.doctor_id = $1
      ORDER BY ir.created_at DESC
    `, [doctorId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching doctor insurance requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2) Doctor: Accept a request (with ownership check)
exports.acceptInsuranceRequest = async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id; // must be doctor

  try {
    // Ownership check
    const check = await db.query(`SELECT doctor_id, bill_id, patient_id FROM insurance_requests WHERE id = $1`, [requestId]);
    if (check.rowCount === 0) return res.status(404).json({ error: 'Request not found.' });

    const { doctor_id, bill_id, patient_id } = check.rows[0];
    if (doctor_id !== userId) return res.status(403).json({ error: 'Forbidden: not your request.' });

    // Mark request as accepted
    await db.query(`UPDATE insurance_requests SET status = 'accepted' WHERE id = $1`, [requestId]);

    // Mark related bill as paid
    await db.query(`UPDATE bills SET status = 'paid' WHERE id = $1`, [bill_id]);

    // Notify patient
    await db.query(`
      INSERT INTO notifications (user_id, title, body)
      VALUES ($1, $2, $3)
    `, [patient_id, 'Insurance Approved', `Your insurance request for Bill #${bill_id} has been approved and your bill is now marked paid.`]);

    res.status(200).json({ message: 'Insurance request approved and bill paid.' });

  } catch (err) {
    console.error('Error accepting insurance request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3) Doctor: Reject a request (with optional reason + ownership check)
exports.rejectInsuranceRequest = async (req, res) => {
  const requestId = req.params.id;
  const { rejection_message } = req.body;
  const userId = req.user.id;

  try {
    // Ownership check
    const check = await db.query(`SELECT doctor_id, bill_id, patient_id FROM insurance_requests WHERE id = $1`, [requestId]);
    if (check.rowCount === 0) return res.status(404).json({ error: 'Request not found.' });

    const { doctor_id, bill_id, patient_id } = check.rows[0];
    if (doctor_id !== userId) return res.status(403).json({ error: 'Forbidden: not your request.' });

    // Mark request as rejected
    await db.query(`UPDATE insurance_requests SET status = 'rejected' WHERE id = $1`, [requestId]);

    // Mark bill back to unpaid
    await db.query(`UPDATE bills SET status = 'unpaid' WHERE id = $1`, [bill_id]);

    // Notify patient
    await db.query(`
      INSERT INTO notifications (user_id, title, body)
      VALUES ($1, $2, $3)
    `, [patient_id, 'Insurance Rejected', rejection_message || `Your insurance request for Bill #${bill_id} was rejected.`]);

    res.status(200).json({ message: 'Insurance request rejected and patient notified.' });

  } catch (err) {
    console.error('Error rejecting insurance request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Patient: View own insurance requests (by token)
exports.getMyInsuranceRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(`
      SELECT ir.*,
        COALESCE(u.full_name, 'N/A') AS doctor_name
      FROM insurance_requests ir
      LEFT JOIN users u ON ir.doctor_id = u.id
      WHERE ir.patient_id = $1
      ORDER BY ir.created_at DESC
    `, [userId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching my insurance requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Patient: Submit a new insurance request
exports.submitInsuranceRequest = async (req, res) => {
  const userId = req.user.id;
  const { doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date } = req.body;

  if (!insurance_company || !insurance_id_number || !start_date || !end_date) {
    return res.status(400).json({ error: 'insurance_company, insurance_id_number, start_date, and end_date are required.' });
  }

  try {
    const result = await db.query(`
      INSERT INTO insurance_requests (patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [userId, doctor_id || null, bill_id || null, insurance_company, insurance_id_number, start_date, end_date]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting insurance request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4) Patient: View own insurance requests
exports.getPatientInsuranceRequests = async (req, res) => {
  const patientId = req.params.id;

  try {
    const result = await db.query(`
      SELECT 
        ir.*, 
        b.amount, 
        b.details AS description, 
        u.full_name AS doctor_name
      FROM insurance_requests ir
      JOIN bills b ON ir.bill_id = b.id
      JOIN users u ON ir.doctor_id = u.id
      WHERE ir.patient_id = $1
      ORDER BY ir.created_at DESC
    `, [patientId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching patient insurance requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 5) Admin: View all insurance requests
exports.getAllInsuranceRequests = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        ir.*,
        p.full_name AS patient_name,
        d.full_name AS doctor_name,
        b.amount,
        b.details AS description
      FROM insurance_requests ir
      JOIN users p ON ir.patient_id = p.id
      JOIN users d ON ir.doctor_id = d.id
      JOIN bills b ON ir.bill_id = b.id
      ORDER BY ir.created_at DESC
    `);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching all insurance requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Patient: Check for active (accepted) insurance coverage
exports.getActiveInsurance = async (req, res) => {
  const userId = req.user.id;
  try {
    // insurance_requests.patient_id references users.id directly (not patients.id)
    const result = await db.query(`
      SELECT ir.* FROM insurance_requests ir
      WHERE ir.patient_id = $1 AND ir.status = 'accepted'
      ORDER BY ir.created_at DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({ hasInsurance: false, insurance: null });
    }
    res.json({ hasInsurance: true, insurance: result.rows[0] });
  } catch (err) {
    console.error('Error checking active insurance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
