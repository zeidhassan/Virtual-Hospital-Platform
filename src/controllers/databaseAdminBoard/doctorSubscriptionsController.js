const db = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all doctor subscriptions
exports.getAllDoctorSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "user_id",
      "plan_id",
      "billing_cycle",
      "status",
      "paperwork_url",
      "start_date",
      "end_date",
      "admin_notes",
      "created_at",
      "updated_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[`ds.${key}`] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'doctor_subscriptions ds',
      page,
      limit,
      sort,
      sortTable: 'ds',
      select: `
        ds.*, u.full_name AS doctor_name, dp.name AS plan_name
      `,
      join: `
        LEFT JOIN users u ON ds.user_id = u.id
        LEFT JOIN doctor_plans dp ON ds.plan_id = dp.id
      `,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

// Get doctor subscription by ID
exports.getDoctorSubscriptionsById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM doctor_subscriptions WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Doctor subscription not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Create a new doctor subscription
exports.createDoctorSubscriptions = async (req, res) => {
  const { user_id, plan_id, billing_cycle, status, paperwork_url, start_date, end_date, admin_notes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO doctor_subscriptions (user_id, plan_id, billing_cycle, status, paperwork_url, start_date, end_date, admin_notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [user_id, plan_id, billing_cycle, status, paperwork_url, start_date, end_date, admin_notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Update a doctor subscription
exports.updateDoctorSubscriptions = async (req, res) => {
  const { id } = req.params;
  const { user_id, plan_id, billing_cycle, status, paperwork_url, start_date, end_date, admin_notes } = req.body;
  try {
    const result = await db.query(
      'UPDATE doctor_subscriptions SET user_id=$1, plan_id=$2, billing_cycle=$3, status=$4, paperwork_url=$5, start_date=$6, end_date=$7, admin_notes=$8 WHERE id=$9 RETURNING *',
      [user_id, plan_id, billing_cycle, status, paperwork_url, start_date, end_date, admin_notes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Doctor subscription not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Delete a doctor subscription
exports.deleteDoctorSubscriptions = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM doctor_subscriptions WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Doctor subscription not found' });
    res.json({ message: 'Doctor subscription deleted', subscription: result.rows[0] });
  } catch (err) {
    return handleDbError(err, res);
  }
};