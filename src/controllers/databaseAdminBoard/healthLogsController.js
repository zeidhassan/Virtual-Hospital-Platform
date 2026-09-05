const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllHealthLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'patient_id', 'log_type', 'data', 'notes', 'logged_at'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'health_logs',
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

exports.getHealthLogById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM health_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Health log not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createHealthLog = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create health logs.' });
  }

  const { patient_id, log_type, data, notes } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO health_logs (patient_id, log_type, data, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [patient_id, log_type, data, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updateHealthLog = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update health logs.' });
  }

  const { log_type, data, notes } = req.body;

  try {
    const result = await pool.query(
      `UPDATE health_logs
       SET log_type=$1, data=$2, notes=$3
       WHERE id=$4 RETURNING *`,
      [log_type, data, notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Health log not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deleteHealthLog = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete health logs.' });
  }

  try {
    const result = await pool.query('DELETE FROM health_logs WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Health log not found' });
    }

    res.json({ message: 'Health log deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
