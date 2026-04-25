const db = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all doctor plans
exports.getAllDoctorPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "name",
      "description",
      "monthly_price",
      "yearly_price",
      "features",
      "currency",
      "created_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }
    const result = await paginate({
      table: 'doctor_plans',
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

// Get doctor plan by ID
exports.getDoctorPlansById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM doctor_plans WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Doctor plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};
// Helper to safely normalize the features string into a JS object
function normalizeFeatures(input) {
  if (typeof input === 'object' && input !== null) return input;

  if (typeof input === 'string') {
    try {
      const fixed = input.trim().startsWith('{') ? input : `{${input}}`;
      return JSON.parse(fixed);
    } catch (err) {
      throw new Error('Invalid features format. Must be JSON.');
    }
  }

  return {};
}

// Create a new doctor plan
exports.createDoctorPlans = async (req, res) => {
  const { name, description, monthly_price, yearly_price, features, currency } = req.body;

  try {
    const parsedFeatures = normalizeFeatures(features);

    const result = await db.query(
      `INSERT INTO doctor_plans (name, description, monthly_price, yearly_price, features, currency)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, monthly_price, yearly_price, parsedFeatures, currency || 'SAR']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Update a doctor plan
exports.updateDoctorPlans = async (req, res) => {
  const { id } = req.params;
  const { name, description, monthly_price, yearly_price, features, currency } = req.body;

  try {
    const parsedFeatures = normalizeFeatures(features);

    const result = await db.query(
      `UPDATE doctor_plans
       SET name = $1, description = $2, monthly_price = $3, yearly_price = $4, features = $5, currency = $6
       WHERE id = $7 RETURNING *`,
      [name, description, monthly_price, yearly_price, parsedFeatures, currency || 'SAR', id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Doctor plan not found' });

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Delete a doctor plan
exports.deleteDoctorPlans = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM doctor_plans WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Doctor plan not found' });
    res.json({ message: 'Doctor plan deleted', plan: result.rows[0] });
  } catch (err) {
    return handleDbError(err, res);
  }
};