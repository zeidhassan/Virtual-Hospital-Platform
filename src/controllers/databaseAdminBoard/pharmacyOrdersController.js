const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all pharmacy orders (admin only)
exports.getAllPharmacyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "patient_id",
      "prescription_id",
      "medications",
      "quantities",
      "total_amount",
      "currency",
      "status",
      "prescription_file",
      "delivery_address",
      "payment_method",
      "insurance_request_id",
      "ordered_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'pharmacy_orders',
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

// GET pharmacy order by ID (admin only)
exports.getPharmacyOrderById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM pharmacy_orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a new pharmacy order (admin only)
exports.createPharmacyOrder = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create pharmacy orders.' });
  }

  const { patient_id, prescription_id, medications, quantities, total_amount, currency, status, prescription_file, delivery_address, payment_method, insurance_request_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO pharmacy_orders (patient_id, prescription_id, medications, quantities, total_amount, currency, status, prescription_file, delivery_address, payment_method, insurance_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [patient_id, prescription_id, medications, quantities, total_amount, currency, status, prescription_file, delivery_address, payment_method, insurance_request_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE pharmacy order (admin only)
exports.updatePharmacyOrder = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update pharmacy orders.' });
  }

  const { prescription_id, medications, quantities, total_amount, currency, status, prescription_file, delivery_address, payment_method, insurance_request_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE pharmacy_orders
       SET prescription_id=$1, medications=$2, quantities=$3, total_amount=$4, currency=$5, status=$6, prescription_file=$7, delivery_address=$8, payment_method=$9, insurance_request_id=$10
       WHERE id=$11 RETURNING *`,
      [prescription_id, medications, quantities, total_amount, currency, status, prescription_file, delivery_address, payment_method, insurance_request_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE pharmacy order (admin only)
exports.deletePharmacyOrder = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete pharmacy orders.' });
  }

  try {
    const result = await pool.query('DELETE FROM pharmacy_orders WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Pharmacy order deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
