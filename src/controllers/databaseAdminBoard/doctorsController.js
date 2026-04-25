const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all doctors (admin only)
exports.getAllDoctors = async (req, res) => {
  try {
    const validColumns = [
      "d.id",
      "d.user_id",
      "d.specialization",
      "d.qualifications",
      "d.availability_status",
      "d.profile_picture_url",
      "d.bio",
      "u.full_name",
      "u.email",
      "u.phone",
      "u.gender",
      "u.date_of_birth"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }
    const result = await paginate({
      table: 'doctors',
      join: 'AS d JOIN users u ON d.user_id = u.id',
      select: 'd.*, u.full_name, u.email, u.phone, u.gender, u.date_of_birth',
      sort: req.query.sort || '+id',
      sortTable: 'd',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error (doctors):', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

// GET doctor by ID (admin only)
exports.getDoctorById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query(`
      SELECT 
        d.*, 
        u.full_name, u.email, u.phone, u.gender, u.date_of_birth
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE doctor (admin only)
exports.createDoctor = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create doctor profiles.' });
  }

  const {
    user_id,
    specialization,
    qualifications,
    availability_status,
    profile_picture_url,
    bio
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO doctors (user_id, specialization, qualifications, availability_status, profile_picture_url, bio)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, specialization, qualifications, availability_status, profile_picture_url, bio]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE doctor (admin only)
exports.updateDoctor = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update doctor profiles.' });
  }

  const {
    specialization,
    qualifications,
    availability_status,
    profile_picture_url,
    bio
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE doctors
       SET specialization=$1, qualifications=$2, availability_status=$3, profile_picture_url=$4, bio=$5
       WHERE id=$6 RETURNING *`,
      [specialization, qualifications, availability_status, profile_picture_url, bio, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE doctor (admin only)
exports.deleteDoctor = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete doctor profiles.' });
  }

  try {
    const result = await pool.query('DELETE FROM doctors WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
