const db = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all insurance requests
exports.getAllInsuranceRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "patient_id",
      "doctor_id",
      "bill_id",
      "insurance_company",
      "insurance_id_number",
      "start_date",
      "end_date",
      "status",
      "created_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'insurance_requests',
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

// Get insurance request by ID
exports.getInsuranceRequestsById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM insurance_requests WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insurance request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Create a new insurance request
exports.createInsuranceRequests = async (req, res) => {
  const { patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date, status } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO insurance_requests (patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Update an insurance request
exports.updateInsuranceRequests = async (req, res) => {
  const { id } = req.params;
  const { patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date, status } = req.body;
  try {
    const result = await db.query(
      'UPDATE insurance_requests SET patient_id=$1, doctor_id=$2, bill_id=$3, insurance_company=$4, insurance_id_number=$5, start_date=$6, end_date=$7, status=$8 WHERE id=$9 RETURNING *',
      [patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insurance request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Delete an insurance request
exports.deleteInsuranceRequests = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM insurance_requests WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insurance request not found' });
    res.json({ message: 'Insurance request deleted', request: result.rows[0] });
  } catch (err) {
    return handleDbError(err, res);
  }
};