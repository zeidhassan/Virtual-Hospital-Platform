const db = require('../../config/db');
const paginate = require('../../utils/pagination');

const VALID_STATUSES = ['pending', 'processing', 'dispatched', 'delivered', 'cancelled'];

exports.getAllOrders = async (req, res) => {
  try {
    const { patient, status } = req.query;

    const result = await paginate({
      table: 'pharmacy_orders po',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-ordered_at',
      sortTable: 'po',
      join: `
        JOIN patients p ON po.patient_id = p.id
        JOIN users puser ON p.user_id = puser.id
      `,
      select: `po.*, puser.full_name AS patient_name`,
      filters: {
        'puser.full_name': patient || undefined,
        'po.status': status || undefined,
      }
    });

    res.json(result);
  } catch (err) {
    console.error('[getAllOrders]', err.message);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await db.query(`
      SELECT po.*, puser.full_name AS patient_name
      FROM pharmacy_orders po
      JOIN patients p ON po.patient_id = p.id
      JOIN users puser ON p.user_id = puser.id
      WHERE po.id = $1
    `, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = result.rows[0];

    // Patient can only view own orders
    if (req.user.role === 'patient') {
      const patientRes = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
      if (patientRes.rows.length === 0 || patientRes.rows[0].id !== order.patient_id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    res.json(order);
  } catch (err) {
    console.error('[getOrderById]', err.message);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const patientResult = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    const patientId = patientResult.rows[0].id;

    const result = await paginate({
      table: 'pharmacy_orders po',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-ordered_at',
      sortTable: 'po',
      filters: {
        'po.patient_id': patientId,
        'po.status': req.query.status || undefined,
      },
      select: 'po.*',
    });

    res.json(result);
  } catch (err) {
    console.error('[getMyOrders]', err.stack);
    res.status(500).json({ error: 'Failed to fetch your orders.' });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { medications, quantities } = req.query;
    const { delivery_address, payment_method, insurance_request_id, prescription_id } = req.body;

    if (!medications || typeof medications !== 'string') {
      return res.status(400).json({ error: 'No medications provided' });
    }

    const medList = medications.split(',').map(m => m.trim()).filter(Boolean);
    if (medList.length === 0) {
      return res.status(400).json({ error: 'Empty medication list' });
    }

    const qtyList = quantities
      ? quantities.split(',').map(q => Math.max(1, parseInt(q) || 1))
      : medList.map(() => 1);

    if (!delivery_address) {
      return res.status(400).json({ error: 'Delivery address is required.' });
    }

    const allowedPaymentMethods = ['cash', 'card', 'insurance'];
    const paymentMethod = payment_method || 'cash';
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `payment_method must be one of: ${allowedPaymentMethods.join(', ')}` });
    }

    const patientRes = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientRes.rowCount === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const patientId = patientRes.rows[0].id;

    let insuranceRequestId = null;
    if (paymentMethod === 'insurance') {
      const insuranceRes = await db.query(`
        SELECT ir.id FROM insurance_requests ir
        JOIN patients p ON ir.patient_id = p.id
        WHERE p.user_id = $1 AND ir.status = 'accepted'
        ORDER BY ir.created_at DESC LIMIT 1
      `, [req.user.id]);
      if (insuranceRes.rows.length === 0) {
        return res.status(400).json({ error: 'No active insurance coverage found.' });
      }
      insuranceRequestId = insurance_request_id || insuranceRes.rows[0].id;
    }

    const placeholders = medList.map((_, i) => `$${i + 1}`).join(',');
    const medsResult = await db.query(`SELECT * FROM medications WHERE name IN (${placeholders})`, medList);
    if (medsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No valid medications found' });
    }

    const requiresPrescription = medsResult.rows.some(m => m.type === 'prescription');
    if (requiresPrescription && !req.file) {
      return res.status(400).json({ error: 'Prescription file must be uploaded for prescription medications.' });
    }

    const medsMap = {};
    medsResult.rows.forEach(m => { medsMap[m.name] = m; });
    const totalAmount = medList.reduce((sum, name, i) => {
      const med = medsMap[name];
      return med ? sum + parseFloat(med.price) * (qtyList[i] || 1) : sum;
    }, 0);

    const filePath = req.file ? `uploads/prescriptions/${req.file.filename}` : null;

    const linkedPrescriptionId = prescription_id ? parseInt(prescription_id) : null;

    const result = await db.query(`
      INSERT INTO pharmacy_orders
        (patient_id, prescription_id, medications, quantities, total_amount, prescription_file, delivery_address, payment_method, insurance_request_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [patientId, linkedPrescriptionId, medList.join(','), qtyList.join(','), totalAmount, filePath, delivery_address, paymentMethod, insuranceRequestId]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error in createOrder:', err);
    return res.status(500).json({ error: 'Order creation failed' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { new_status } = req.body;

  if (!new_status || !VALID_STATUSES.includes(new_status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const check = await db.query('SELECT id FROM pharmacy_orders WHERE id = $1', [orderId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    await db.query('UPDATE pharmacy_orders SET status = $1 WHERE id = $2', [new_status, orderId]);
    res.json({ message: 'Status updated successfully', status: new_status });
  } catch (err) {
    console.error('[updateOrderStatus]', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const patientRes = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    const patientId = patientRes.rows[0].id;

    const orderRes = await db.query('SELECT id, status, patient_id FROM pharmacy_orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    if (order.patient_id !== patientId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled.' });
    }

    await db.query("UPDATE pharmacy_orders SET status = 'cancelled' WHERE id = $1", [orderId]);
    res.json({ message: 'Order cancelled successfully.' });
  } catch (err) {
    console.error('[cancelOrder]', err.message);
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
};

exports.getMedications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 100;

    const filters = {};
    if (req.query.name) filters['name'] = req.query.name;
    if (req.query.type) filters['type'] = req.query.type;

    const result = await paginate({
      table: 'medications',
      page,
      limit,
      sort,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('getMedications error:', err.message);
    res.status(400).json({ error: 'Failed to fetch medications: ' + err.message });
  }
};
