const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllPatientInsurance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'patient_id', 'insurance_company', 'insurance_id_number', 'start_date', 'end_date', 'is_active'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'patient_insurance',
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

exports.getPatientInsuranceById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM patient_insurance WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient insurance record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createPatientInsurance = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create patient insurance records.' });
  }

  const { patient_id, insurance_company, insurance_id_number, start_date, end_date, is_active } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO patient_insurance (patient_id, insurance_company, insurance_id_number, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [patient_id, insurance_company, insurance_id_number, start_date, end_date, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updatePatientInsurance = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update patient insurance records.' });
  }

  const { insurance_company, insurance_id_number, start_date, end_date, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE patient_insurance
       SET insurance_company=$1, insurance_id_number=$2, start_date=$3, end_date=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [insurance_company, insurance_id_number, start_date, end_date, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient insurance record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deletePatientInsurance = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete patient insurance records.' });
  }

  try {
    const result = await pool.query('DELETE FROM patient_insurance WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient insurance record not found' });
    }

    res.json({ message: 'Patient insurance record deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
