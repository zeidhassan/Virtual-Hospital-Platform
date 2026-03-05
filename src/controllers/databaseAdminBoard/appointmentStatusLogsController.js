const pool = require('../../config/db');
const paginate = require('../../utils/pagination'); // Pagination utility

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "appointment_id",
      "old_status",
      "new_status",
      "changed_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'appointment_status_logs',
      page,
      limit,
      sort,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointment_status_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { appointment_id, old_status, new_status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO appointment_status_logs (appointment_id, old_status, new_status)
       VALUES ($1, $2, $3) RETURNING *`,
      [appointment_id, old_status, new_status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { appointment_id, old_status, new_status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE appointment_status_logs
       SET appointment_id = $1, old_status = $2, new_status = $3
       WHERE id = $4 RETURNING *`,
      [appointment_id, old_status, new_status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM appointment_status_logs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
