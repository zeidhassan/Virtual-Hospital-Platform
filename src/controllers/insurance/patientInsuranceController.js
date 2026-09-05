// src/controllers/insurance/patientInsuranceController.js

const db = require('../../config/db');

const getPatientId = async (userId) => {
  const res = await db.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return res.rows.length > 0 ? res.rows[0].id : null;
};

// GET /api/insurance-requests/policy — returns active policy or null
exports.getMyPolicy = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(403).json({ error: 'Patient record not found.' });

    const result = await db.query(
      'SELECT * FROM patient_insurance WHERE patient_id = $1 AND is_active = TRUE',
      [patientId]
    );
    res.json({ policy: result.rows[0] || null });
  } catch (err) {
    console.error('Error fetching patient insurance policy:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/insurance-requests/policy — upsert active policy (deactivates old one first)
exports.saveMyPolicy = async (req, res) => {
  const { insurance_company, insurance_id_number, start_date, end_date } = req.body;

  if (!insurance_company || !insurance_id_number || !start_date || !end_date) {
    return res.status(400).json({ error: 'insurance_company, insurance_id_number, start_date, and end_date are required.' });
  }

  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(403).json({ error: 'Patient record not found.' });

    await db.query(
      'UPDATE patient_insurance SET is_active = FALSE, updated_at = NOW() WHERE patient_id = $1 AND is_active = TRUE',
      [patientId]
    );

    const result = await db.query(
      `INSERT INTO patient_insurance (patient_id, insurance_company, insurance_id_number, start_date, end_date, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW()) RETURNING *`,
      [patientId, insurance_company, insurance_id_number, start_date, end_date]
    );

    res.status(201).json({ policy: result.rows[0] });
  } catch (err) {
    console.error('Error saving patient insurance policy:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/insurance-requests/policy — cancel (deactivate) active policy
exports.cancelMyPolicy = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(403).json({ error: 'Patient record not found.' });

    const result = await db.query(
      'UPDATE patient_insurance SET is_active = FALSE, updated_at = NOW() WHERE patient_id = $1 AND is_active = TRUE RETURNING id',
      [patientId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'No active insurance policy found.' });
    res.json({ message: 'Insurance policy cancelled.' });
  } catch (err) {
    console.error('Error cancelling patient insurance policy:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
