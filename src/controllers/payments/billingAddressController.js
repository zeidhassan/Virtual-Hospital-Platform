const pool = require('../../config/db');

// GET /api/payments/billing-address
exports.getBillingAddress = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM billing_addresses WHERE user_id = $1 AND addr_type = 'billing' ORDER BY is_default DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments/billing-address
exports.saveBillingAddress = async (req, res) => {
  try {
    const { first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone } = req.body;
    const userId = req.user.id;

    if (!first_name || !last_name || !line1 || !city || !country_code) {
      return res.status(400).json({ error: 'first_name, last_name, line1, city, country_code are required' });
    }

    const existing = await pool.query(
      `SELECT id FROM billing_addresses WHERE user_id = $1 AND addr_type = 'billing' LIMIT 1`,
      [userId]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE billing_addresses
         SET first_name=$2, last_name=$3, line1=$4, line2=$5, city=$6, region=$7,
             postal_code=$8, country_code=$9, email=$10, phone=$11, updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [existing.rows[0].id, first_name, last_name, line1, line2 || null, city, region || null, postal_code || null, country_code, email || null, phone || null]
      );
    } else {
      result = await pool.query(
        `INSERT INTO billing_addresses (user_id, addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default)
         VALUES ($1, 'billing', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true) RETURNING *`,
        [userId, first_name, last_name, line1, line2 || null, city, region || null, postal_code || null, country_code, email || null, phone || null]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
