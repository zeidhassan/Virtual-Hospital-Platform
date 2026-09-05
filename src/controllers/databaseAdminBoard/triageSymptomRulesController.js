const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllTriageSymptomRules = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'urgency_level', 'keywords', 'recommended_action', 'recommended_department'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'triage_symptom_rules',
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

exports.getTriageSymptomRuleById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM triage_symptom_rules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage symptom rule not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createTriageSymptomRule = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create triage symptom rules.' });
  }

  const { urgency_level, keywords, recommended_action, recommended_department } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO triage_symptom_rules (urgency_level, keywords, recommended_action, recommended_department)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [urgency_level, keywords, recommended_action, recommended_department]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updateTriageSymptomRule = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update triage symptom rules.' });
  }

  const { urgency_level, keywords, recommended_action, recommended_department } = req.body;

  try {
    const result = await pool.query(
      `UPDATE triage_symptom_rules
       SET urgency_level=$1, keywords=$2, recommended_action=$3, recommended_department=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [urgency_level, keywords, recommended_action, recommended_department, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage symptom rule not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deleteTriageSymptomRule = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete triage symptom rules.' });
  }

  try {
    const result = await pool.query('DELETE FROM triage_symptom_rules WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage symptom rule not found' });
    }

    res.json({ message: 'Triage symptom rule deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
