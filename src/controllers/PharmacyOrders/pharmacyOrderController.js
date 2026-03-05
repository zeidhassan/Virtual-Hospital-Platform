const db = require('../../config/db');
const paginate = require('../../utils/pagination');
const { uploadPrescription } = require('../../middleware/uploadMiddleware');

exports.getAllOrders = async (req, res) => {
  try {
    const { medication, patient, date, status } = req.query;

    const result = await paginate({
      table: 'pharmacy_orders',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '+id',
      sortTable: 'po',
      join: `
        As po JOIN patients p ON po.id = p.id
        JOIN users puser ON p.user_id = puser.id
      `,
      select: `
        po.*, puser.full_name AS patient_name
      `,
      filters: {
        "puser.full_name": patient,
        "po.ordered_at": date,
        "po.status": status,
        "p.medications": medication
      }
    });

    res.json(result);
  } catch (err) {
    console.error('[getAllOrders]', err.message);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

exports.getOrdersByPatient = async (req, res) => {
  try {
    const { id } = req.params; // user_id (not patient_id)

    // Resolve patient ID from user ID
    const patientResult = await db.query(
      'SELECT id FROM patients WHERE user_id = $1',
      [id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientId = patientResult.rows[0].id;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-ordered_at';

    const validColumns = [
      "medications",
      "total_amount",
      "status",
      "ordered_at",
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    // Paginate pharmacy orders for this patient
    const result = await paginate({
      table: 'pharmacy_orders po',
      page,
      limit,
      sort,
      sortTable: 'po',
      filters: {
        'po.patient_id': patientId,
        ...filters
      },
      select: `
        po.*
      `
    });

    res.json(result);
  } catch (err) {
    console.error('[ERROR] fetching pharmacy orders:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { medications } = req.query;

    if (!medications || typeof medications !== 'string') {
      return res.status(400).json({ error: 'No medications provided' });
    }

    // Parse comma-separated medications and trim whitespace
    const medList = medications.split(',').map(m => m.trim()).filter(Boolean);

    if (medList.length === 0) {
      return res.status(400).json({ error: 'Empty medication list' });
    }

    // Fetch patient ID from authenticated user
    const patientRes = await db.query(
      'SELECT id FROM patients WHERE user_id = $1',
      [req.user.id]
    );

    if (patientRes.rowCount === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientId = patientRes.rows[0].id;

    // Get medication prices
    const placeholders = medList.map((_, i) => `$${i + 1}`).join(',');
    const medsQuery = `SELECT * FROM medications WHERE name IN (${placeholders})`;
    const medsResult = await db.query(medsQuery, medList);

    if (medsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No valid medications found' });
    }

    // Check if any medication is of type 'prescription'
    const requiresPrescription = medsResult.rows.some(m => m.type === 'prescription');

    if (requiresPrescription && !req.file && !req.headers['content-type']?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Prescription file is required for selected medications.' });
    }

    const totalAmount = medsResult.rows.reduce((sum, m) => sum + parseFloat(m.price), 0);

    uploadPrescription.single('prescription_file')(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({ error: 'File upload failed' });
      }

      // Handle file if included
      let filePath = null;
      if (req.file) {
        filePath = `uploads/prescriptions/${req.file.filename}`;
      }

      if (requiresPrescription && !req.file) {
        return res.status(400).json({ error: 'Prescription file must be uploaded for prescription medications.' });
      }

      // Insert order
      const insertQuery = `
        INSERT INTO pharmacy_orders (patient_id, medications, total_amount, prescription_file)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await db.query(insertQuery, [
        patientId,
        medList.join(','), // Store full array
        totalAmount,
        filePath
      ]);

      return res.status(201).json(result.rows[0]);
    });
  } catch (err) {
    console.error('Error in createOrder:', err);
    return res.status(500).json({ error: 'Order creation failed' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { new_status } = req.body;

  try {
    await db.query(`UPDATE pharmacy_orders SET status = $1 WHERE id = $2`, [new_status, orderId]);
    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.getMedications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "name",
      "type",
      "description",
      "price"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'medications',
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
