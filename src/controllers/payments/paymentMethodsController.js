const pool = require('../../config/db');

// GET /api/payments/methods
exports.listMethods = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, provider, cardholder_name, brand, last4, exp_month, exp_year, is_default, created_at
       FROM payment_methods WHERE user_id = $1 AND status = 'active' ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments/methods
exports.saveMethod = async (req, res) => {
  try {
    const { card_number, cardholder_name, brand, exp_month, exp_year, set_default } = req.body;
    const userId = req.user.id;

    const raw = String(card_number || '').replace(/\s/g, '');
    if (raw.length < 13) return res.status(400).json({ error: 'Invalid card number' });
    if (!exp_month || !exp_year) return res.status(400).json({ error: 'Expiry date required' });

    if (set_default) {
      await pool.query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [userId]);
    }

    const result = await pool.query(
      `INSERT INTO payment_methods (user_id, provider, cardholder_name, brand, last4, exp_month, exp_year, is_default)
       VALUES ($1, 'card', $2, $3, $4, $5, $6, $7)
       RETURNING id, provider, cardholder_name, brand, last4, exp_month, exp_year, is_default`,
      [userId, cardholder_name || '', brand || 'unknown', raw.slice(-4), Number(exp_month), Number(exp_year), !!set_default]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/payments/methods/:id/default
exports.setDefault = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Payment method not found' });

    await pool.query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [req.user.id]);
    const result = await pool.query('UPDATE payment_methods SET is_default = true WHERE id = $1 RETURNING *', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/payments/methods/:id
exports.deleteMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Payment method not found' });

    await pool.query("UPDATE payment_methods SET status = 'inactive' WHERE id = $1", [id]);
    res.json({ message: 'Payment method removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
