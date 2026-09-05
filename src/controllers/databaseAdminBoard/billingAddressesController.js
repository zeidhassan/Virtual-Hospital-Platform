const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllBillingAddresses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'user_id', 'addr_type', 'first_name', 'last_name', 'line1', 'line2', 'city', 'region', 'postal_code', 'country_code', 'email', 'phone', 'is_default'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'billing_addresses',
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

exports.getBillingAddressById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM billing_addresses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing address not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createBillingAddress = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create billing addresses.' });
  }

  const { user_id, addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO billing_addresses (user_id, addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [user_id, addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updateBillingAddress = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update billing addresses.' });
  }

  const { addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default } = req.body;

  try {
    const result = await pool.query(
      `UPDATE billing_addresses
       SET addr_type=$1, first_name=$2, last_name=$3, line1=$4, line2=$5, city=$6, region=$7, postal_code=$8, country_code=$9, email=$10, phone=$11, is_default=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing address not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deleteBillingAddress = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete billing addresses.' });
  }

  try {
    const result = await pool.query('DELETE FROM billing_addresses WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing address not found' });
    }

    res.json({ message: 'Billing address deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
