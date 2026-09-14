const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllPatientHealthPrograms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'patient_id', 'health_program_id', 'enrolled_at'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'patient_health_programs',
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

exports.getPatientHealthProgramById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM patient_health_programs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient health program not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createPatientHealthProgram = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create patient health programs.' });
  }

  const { patient_id, health_program_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO patient_health_programs (patient_id, health_program_id)
       VALUES ($1, $2) RETURNING *`,
      [patient_id, health_program_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updatePatientHealthProgram = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update patient health programs.' });
  }

  const { patient_id, health_program_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE patient_health_programs
       SET patient_id=$1, health_program_id=$2
       WHERE id=$3 RETURNING *`,
      [patient_id, health_program_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient health program not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deletePatientHealthProgram = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete patient health programs.' });
  }

  try {
    const result = await pool.query('DELETE FROM patient_health_programs WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient health program not found' });
    }

    res.json({ message: 'Patient health program deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
