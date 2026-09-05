const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllTriageSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'patient_id', 'symptoms_text', 'urgency_level', 'recommended_action', 'recommended_department', 'follow_up_recommended', 'escalated_to_doctor_id'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'triage_sessions',
      page,
      limit,
      sort,
      filters,
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

exports.getTriageSessionById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM triage_sessions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createTriageSession = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create triage sessions.' });
  }

  const { patient_id, symptoms_text, urgency_level, recommended_action, recommended_department, follow_up_recommended, escalated_to_doctor_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO triage_sessions (patient_id, symptoms_text, urgency_level, recommended_action, recommended_department, follow_up_recommended, escalated_to_doctor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [patient_id, symptoms_text, urgency_level, recommended_action, recommended_department, follow_up_recommended, escalated_to_doctor_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updateTriageSession = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update triage sessions.' });
  }

  const { symptoms_text, urgency_level, recommended_action, recommended_department, follow_up_recommended, escalated_to_doctor_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE triage_sessions
       SET symptoms_text=$1, urgency_level=$2, recommended_action=$3, recommended_department=$4, follow_up_recommended=$5, escalated_to_doctor_id=$6
       WHERE id=$7 RETURNING *`,
      [symptoms_text, urgency_level, recommended_action, recommended_department, follow_up_recommended, escalated_to_doctor_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deleteTriageSession = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete triage sessions.' });
  }

  try {
    const result = await pool.query('DELETE FROM triage_sessions WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage session not found' });
    }

    res.json({ message: 'Triage session deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
