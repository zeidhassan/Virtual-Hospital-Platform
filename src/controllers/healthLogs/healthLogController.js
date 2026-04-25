const pool = require('../../config/db');
const paginate = require('../../utils/pagination');
const handleDbError = require('../../utils/handleDbError');

const VALID_LOG_TYPES = ['vitals', 'symptom_update', 'medication_adherence', 'general'];

// POST /api/health-logs — patient submits a health log entry
exports.createHealthLog = async (req, res) => {
  const { log_type, data, notes } = req.body;

  if (!log_type) return res.status(400).json({ error: 'log_type is required' });
  if (!VALID_LOG_TYPES.includes(log_type)) {
    return res.status(400).json({ error: `log_type must be one of: ${VALID_LOG_TYPES.join(', ')}` });
  }

  try {
    const patientRow = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientRow.rows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patientId = patientRow.rows[0].id;

    const dataJson = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;

    const result = await pool.query(
      `INSERT INTO health_logs (patient_id, log_type, data, notes)
       VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
      [patientId, log_type, dataJson, notes || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// GET /api/health-logs/my — patient views own health log history
exports.getMyHealthLogs = async (req, res) => {
  try {
    const patientRow = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientRow.rows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patientId = patientRow.rows[0].id;

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort  = req.query.sort || '-logged_at';

    const filters = { patient_id: patientId };
    if (req.query.log_type) filters.log_type = req.query.log_type;

    const result = await paginate({ table: 'health_logs', page, limit, sort, filters });
    return res.json(result);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// GET /api/health-logs/patient/:patientId — doctor views an assigned patient's health logs
exports.getPatientHealthLogs = async (req, res) => {
  const { patientId } = req.params;

  try {
    const doctorRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    if (doctorRow.rows.length === 0) return res.status(404).json({ error: 'Doctor profile not found' });
    const doctorId = doctorRow.rows[0].id;

    // Verify doctor has had at least one appointment with this patient
    const apptCheck = await pool.query(
      `SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1`,
      [doctorId, patientId]
    );
    if (apptCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied — no appointment history with this patient' });
    }

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort  = req.query.sort || '-logged_at';

    const filters = { patient_id: patientId };
    if (req.query.log_type) filters.log_type = req.query.log_type;

    const result = await paginate({ table: 'health_logs', page, limit, sort, filters });
    return res.json(result);
  } catch (err) {
    return handleDbError(err, res);
  }
};
