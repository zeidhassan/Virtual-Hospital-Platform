const pool = require('../../config/db'); // PostgreSQL connection pool
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all medical records (admin only)
exports.getAllMedicalRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "patient_id",
      "doctor_id",
      "appointment_id",
      "record_type",
      "description",
      "file_url",
      "created_at",
      "private"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'medical_records',
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

// GET medical record by ID (admin only)
exports.getMedicalRecordById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM medical_records WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE a medical record (admin only)
exports.createMedicalRecord = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create medical records.' });
  }

  const { patient_id, doctor_id, appointment_id, record_type, description, file_url, private } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, file_url, created_at, private)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7) RETURNING *`,
      [patient_id, doctor_id, appointment_id, record_type, description, file_url, private]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE a medical record (admin only)
exports.updateMedicalRecord = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update medical records.' });
  }

  const { record_type, description, file_url } = req.body;

  try {
    const result = await pool.query(
      `UPDATE medical_records 
       SET record_type=$1, description=$2, file_url=$3
       WHERE id=$4 RETURNING *`,
      [record_type, description, file_url, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE a medical record (admin only)
exports.deleteMedicalRecord = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete medical records.' });
  }

  try {
    const result = await pool.query('DELETE FROM medical_records WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    res.json({ message: 'Medical record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
