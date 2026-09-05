const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllPaymentMethods = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'user_id', 'provider', 'cardholder_name', 'brand', 'last4', 'exp_month', 'exp_year', 'status', 'is_default'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'payment_methods',
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

exports.getPaymentMethodById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM payment_methods WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createPaymentMethod = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create payment methods.' });
  }

  const { user_id, provider, cardholder_name, brand, last4, exp_month, exp_year, status, is_default } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO payment_methods (user_id, provider, cardholder_name, brand, last4, exp_month, exp_year, status, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [user_id, provider, cardholder_name, brand, last4, exp_month, exp_year, status, is_default]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updatePaymentMethod = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update payment methods.' });
  }

  const { cardholder_name, brand, last4, exp_month, exp_year, status, is_default } = req.body;

  try {
    const result = await pool.query(
      `UPDATE payment_methods
       SET cardholder_name=$1, brand=$2, last4=$3, exp_month=$4, exp_year=$5, status=$6, is_default=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [cardholder_name, brand, last4, exp_month, exp_year, status, is_default, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deletePaymentMethod = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete payment methods.' });
  }

  try {
    const result = await pool.query('DELETE FROM payment_methods WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    res.json({ message: 'Payment method deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
