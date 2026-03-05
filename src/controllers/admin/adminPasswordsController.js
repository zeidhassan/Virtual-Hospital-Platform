// controllers/admin/adminPasswordsController.js
const pool = require('../../config/db');

exports.getPlainPasswords = async (req, res) => {
  try {
    const result = await pool.query('SELECT email, password FROM user_passwords');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch passwords' });
  }
};
