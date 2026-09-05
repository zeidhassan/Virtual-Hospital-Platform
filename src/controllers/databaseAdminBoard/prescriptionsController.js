const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility
const { encrypt, decrypt } = require('../../utils/encrypt');

// instructions is stored encrypted (matching every other controller that
// writes/reads this column) — the generic board previously read/wrote it as
// plain text, which corrupted the field for every other reader.
const decryptRecord = (row) => (row ? { ...row, instructions: decrypt(row.instructions) } : row);

// GET all prescriptions (admin only)
exports.getAllPrescriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "appointment_id",
      "medication_id",
      "dosage",
      "instructions",
      "issued_date",
      "refills_used",
      "pack_limit",
      "limit_reached"
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

    res.json({ ...result, data: result.data.map(decryptRecord) });
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

    res.json(decryptRecord(result.rows[0]));
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a new prescription (admin only)
exports.createPrescription = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create prescriptions.' });
  }

  const { appointment_id, medication_id, dosage, instructions, issued_date, refills_used, pack_limit, limit_reached } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO prescriptions (appointment_id, medication_id, dosage, instructions, issued_date, refills_used, pack_limit, limit_reached)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [appointment_id, medication_id, dosage, encrypt(instructions), issued_date, refills_used, pack_limit, limit_reached]
    );

    res.status(201).json(decryptRecord(result.rows[0]));
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE prescription (admin only)
exports.updatePrescription = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update prescriptions.' });
  }

  const { medication_id, dosage, instructions, issued_date, refills_used, pack_limit, limit_reached } = req.body;

  try {
    const result = await pool.query(
      `UPDATE prescriptions
       SET medication_id=$1, dosage=$2, instructions=$3, issued_date=$4, refills_used=$5, pack_limit=$6, limit_reached=$7
       WHERE id=$8 RETURNING *`,
      [medication_id, dosage, encrypt(instructions), issued_date, refills_used, pack_limit, limit_reached, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json(decryptRecord(result.rows[0]));
  } catch (err) {
    return handleDbError(err, res);
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
    return handleDbError(err, res);
  }
};
