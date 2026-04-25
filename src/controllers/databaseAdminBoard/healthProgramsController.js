const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all health programs (admin only)
exports.getAllPrograms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "name",
      "description",
      "start_date",
      "end_date",
      "eligibility"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'health_programs',
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

// GET program by ID (admin only)
exports.getProgramById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM health_programs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a new program (admin only)
exports.createProgram = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create programs.' });
  }

  const { name, description, start_date, end_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO health_programs (name, description, start_date, end_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, start_date, end_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE program (admin only)
exports.updateProgram = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update programs.' });
  }

  const { name, description, start_date, end_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE health_programs
       SET name=$1, description=$2, start_date=$3, end_date=$4
       WHERE id=$5 RETURNING *`,
      [name, description, start_date, end_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE program (admin only)
exports.deleteProgram = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete programs.' });
  }

  try {
    const result = await pool.query('DELETE FROM health_programs WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json({ message: 'Program deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
