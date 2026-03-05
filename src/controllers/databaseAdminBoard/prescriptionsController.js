const pool = require('../../config/db'); // PostgreSQL connection pool
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all prescriptions (admin only)
exports.getAllPrescriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "appointment_id",
      "medication",
      "dosage",
      "instructions",
      "issued_date"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'prescriptions',
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

// GET prescription by ID (admin only)
exports.getPrescriptionById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM prescriptions WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE a new prescription (admin only)
exports.createPrescription = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create prescriptions.' });
  }

  const { appointment_id, medication, dosage, instructions, issued_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO prescriptions (appointment_id, medication, dosage, instructions, issued_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [appointment_id, medication, dosage, instructions, issued_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE prescription (admin only)
exports.updatePrescription = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update prescriptions.' });
  }

  const { medication, dosage, instructions, issued_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE prescriptions 
       SET medication=$1, dosage=$2, instructions=$3, issued_date=$4
       WHERE id=$5 RETURNING *`,
      [medication, dosage, instructions, issued_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE prescription (admin only)
exports.deletePrescription = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete prescriptions.' });
  }

  try {
    const result = await pool.query('DELETE FROM prescriptions WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json({ message: 'Prescription deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
