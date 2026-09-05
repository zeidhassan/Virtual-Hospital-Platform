const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllPaymentTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'user_id', 'bill_id', 'doctor_subscription_id', 'amount', 'currency', 'method_type', 'fpx_bank', 'payment_method_id', 'transaction_ref', 'status'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'payment_transactions',
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

exports.getPaymentTransactionById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM payment_transactions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createPaymentTransaction = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create payment transactions.' });
  }

  const { user_id, bill_id, doctor_subscription_id, amount, currency, method_type, fpx_bank, payment_method_id, transaction_ref, status } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO payment_transactions (user_id, bill_id, doctor_subscription_id, amount, currency, method_type, fpx_bank, payment_method_id, transaction_ref, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [user_id, bill_id, doctor_subscription_id, amount, currency, method_type, fpx_bank, payment_method_id, transaction_ref, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updatePaymentTransaction = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update payment transactions.' });
  }

  const { amount, currency, method_type, fpx_bank, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE payment_transactions
       SET amount=$1, currency=$2, method_type=$3, fpx_bank=$4, status=$5
       WHERE id=$6 RETURNING *`,
      [amount, currency, method_type, fpx_bank, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deletePaymentTransaction = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete payment transactions.' });
  }

  try {
    const result = await pool.query('DELETE FROM payment_transactions WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment transaction not found' });
    }

    res.json({ message: 'Payment transaction deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
