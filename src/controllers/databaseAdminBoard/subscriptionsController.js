const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all subscriptions (admin only)
exports.getAllSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "patient_id",
      "plan_name",
      "start_date",
      "end_date",
      "auto_renew",
      "status"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'subscriptions',
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

// GET subscription by ID (admin only)
exports.getSubscriptionById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a subscription (admin only)
exports.createSubscription = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create subscriptions.' });
  }

  const { patient_id, plan_name, start_date, end_date, auto_renew, status } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO subscriptions (patient_id, plan_name, start_date, end_date, auto_renew, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [patient_id, plan_name, start_date, end_date, auto_renew, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE subscription (admin only)
exports.updateSubscription = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update subscriptions.' });
  }

  const { plan_name, start_date, end_date, auto_renew, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE subscriptions
       SET plan_name=$1, start_date=$2, end_date=$3, auto_renew=$4, status=$5
       WHERE id=$6 RETURNING *`,
      [plan_name, start_date, end_date, auto_renew, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE subscription (admin only)
exports.deleteSubscription = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete subscriptions.' });
  }

  try {
    const result = await pool.query('DELETE FROM subscriptions WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ message: 'Subscription deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
