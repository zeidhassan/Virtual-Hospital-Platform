const db = require('../../config/db');
const paginate = require('../../utils/pagination');
const { encrypt, decrypt } = require('../../utils/encrypt');

// Get Appointments (UPDATES)
exports.getAppointments = async (req, res) => {
  try {
    const patientResult = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const patientId = patientResult.rows[0].id;

    // Pagination & sorting params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-appointment_date'; // optional sort param, default descending date
    const status = req.query.status || undefined;
    const appointment_type = req.query.appointment_type || undefined;

    const result = await paginate({
      table: 'appointments a',
      page,
      limit,
      sort,
      sortTable: 'a',
      select: `
        a.id, a.appointment_date, a.appointment_start_time, a.appointment_end_time,
        a.status, a.notes, a.appointment_type, a.completed_at, a.triage_session_id,
        u.full_name AS doctor_name, d.specialization
      `,
      join: `
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
      `,
      filters: {
        'a.patient_id': patientId,
        'a.status': status,
        'a.appointment_type': appointment_type
      }
    });

    res.json(result);
  } catch (err) {
    console.error('[ERROR] getAppointments:', err);
    res.status(500).json({ error: 'Server error while fetching appointments.' });
  }
};

exports.getDoctorDetailsById = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const result = await db.query(`
      SELECT 
        u.id AS user_id,
        u.full_name,
        u.email,
        u.phone,
        u.gender,
        u.date_of_birth,
        d.id AS doctor_id,
        d.specialization,
        d.qualifications,
        d.availability_status,
        d.profile_picture_url,
        d.bio
      FROM users u
      JOIN doctors d ON d.user_id = u.id
      WHERE d.id = $1
    `, [doctorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ERROR] getDoctorDetailsById:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Prescriptions
exports.getPrescriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get patient_id directly
    const patientResult = await db.query(
      'SELECT id FROM patients WHERE user_id = $1',
      [userId]
    );

    if (patientResult.rowCount === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patientId = patientResult.rows[0].id;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-issued_date';

    const validColumns = [
      "appointment_id",
      "medication_id",
      "issued_date",
      "limit_reached",
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'prescriptions p',
      page,
      limit,
      sort,
      sortTable: 'p',
      filters: {
        'a.patient_id': patientId,
        ...filters
      },
      join: `
        JOIN appointments a ON p.appointment_id = a.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN users du ON d.user_id = du.id
        JOIN medications m ON p.medication_id = m.id
      `,
      select: `
        p.id, p.appointment_id, m.name AS medication, p.medication_id, p.dosage, p.instructions,
        p.pack_limit, p.refills_used, p.limit_reached, p.issued_date, du.full_name AS doctor_name
      `
    });

    const prescriptions = (result.data || []).map(p => ({
      ...p,
      instructions: decrypt(p.instructions),
    }));

    res.json({ ...result, data: prescriptions });
  } catch (err) {
    console.error('[ERROR] getPrescriptions:', err);
    res.status(500).json({ message: 'Failed to fetch prescriptions' });
  }
};

// A patient requesting a refill of a prescription-only medication their doctor
// already prescribed — the only path left to obtain one, since the pharmacy
// no longer sells prescription-type medications directly. Creates a pending
// pharmacy order and a matching bill for the patient to pay on their Bills page.
exports.requestRefill = async (req, res) => {
  try {
    const patientResult = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    const patientId = patientResult.rows[0].id;

    const { id } = req.params;
    const rxRes = await db.query(
      `SELECT p.*, a.patient_id FROM prescriptions p
       JOIN appointments a ON p.appointment_id = a.id
       WHERE p.id = $1`,
      [id]
    );
    if (rxRes.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found.' });
    }
    const rx = rxRes.rows[0];
    if (rx.patient_id !== patientId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (!rx.medication_id) {
      return res.status(400).json({ error: 'This prescription predates catalog-linked refills and cannot be refilled automatically.' });
    }
    if (rx.limit_reached || rx.refills_used >= rx.pack_limit) {
      return res.status(403).json({ error: 'No refills remaining for this prescription.' });
    }

    const medRes = await db.query('SELECT name, price FROM medications WHERE id = $1', [rx.medication_id]);
    if (medRes.rows.length === 0) {
      return res.status(404).json({ error: 'Medication no longer exists in the catalog.' });
    }
    const { name, price } = medRes.rows[0];

    const orderRes = await db.query(
      `INSERT INTO pharmacy_orders (patient_id, prescription_id, medications, quantities, total_amount, status)
       VALUES ($1, $2, $3, '1', $4, 'pending') RETURNING id`,
      [patientId, rx.id, name, price]
    );
    const orderId = orderRes.rows[0].id;

    const billRes = await db.query(
      `INSERT INTO bills (patient_id, amount, status, billing_date, details, pharmacy_order_id)
       VALUES ($1, $2, 'pending', CURRENT_DATE, $3, $4) RETURNING *`,
      [patientId, price, `Prescription refill: ${name} (${rx.dosage})`, orderId]
    );

    const newRefillsUsed = rx.refills_used + 1;
    await db.query(
      `UPDATE prescriptions SET refills_used = $1, limit_reached = $2 WHERE id = $3`,
      [newRefillsUsed, newRefillsUsed >= rx.pack_limit, rx.id]
    );

    await db.query(
      `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'billing')`,
      [req.user.id, 'Refill Bill Ready', `A bill of MYR ${price} for your ${name} refill is ready to pay on your Bills page.`]
    );

    res.status(201).json({ message: 'Refill requested. A bill has been created for payment.', bill: billRes.rows[0], order_id: orderId });
  } catch (err) {
    console.error('[requestRefill]', err);
    res.status(500).json({ error: 'Failed to request refill.' });
  }
};

// Patient uploads their own medical record (e.g. an external lab result or
// document) — not tied to any doctor or appointment, always visible to the
// patient themselves and to every doctor they're linked to (via getMedicalRecords).
exports.uploadMedicalRecord = async (req, res) => {
  try {
    const patientResult = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    const patientId = patientResult.rows[0].id;

    const { record_type, description } = req.body;
    if (!record_type) {
      return res.status(400).json({ error: 'record_type is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'A file is required.' });
    }

    const filePath = `uploads/medical-records/${req.file.filename}`;
    const encryptedDescription = encrypt(description || '');

    const result = await db.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, file_url, created_at, private)
       VALUES ($1, NULL, NULL, $2, $3, $4, NOW(), FALSE) RETURNING *`,
      [patientId, record_type, encryptedDescription, filePath]
    );

    res.status(201).json({ message: 'Medical record uploaded', data: result.rows[0] });
  } catch (err) {
    console.error('[uploadMedicalRecord]', err);
    res.status(500).json({ error: 'Failed to upload medical record.' });
  }
};

exports.getAllMedications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '+id';

    // Only allow filtering on relevant columns
    const validColumns = ['id', 'name', 'type', 'price'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key)) {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'medications',
      page,
      limit,
      sort,
      filters,
      select: 'id, name, type, price'
    });

    res.json(result);
  } catch (err) {
    console.error('[getAllMedications]', err.message);
    res.status(500).json({ error: 'Failed to fetch medications.' });
  }
};

exports.getMedicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT name, type, description, price FROM medications WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[getMedicationById]', err.message);
    res.status(500).json({ error: 'Failed to retrieve medication.' });
  }
};

// Get Medical Records
exports.getMedicalRecords = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.error("[ERROR] No user ID found in token");
      return res.status(401).json({ message: "Unauthorized - no user ID" });
    }

    // Get patient_id from user_id
    const patientResult = await db.query(
      "SELECT id FROM patients WHERE user_id = $1",
      [userId]
    );

    const patientId = patientResult.rows[0]?.id;
    if (!patientId) {
      console.error("[ERROR] No patient found for this user");
      return res.status(404).json({ message: "Patient not found" });
    }

    // Parse pagination query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-created_at';

    const validColumns = [
      "doctor_id",
      "appointment_id",
      "record_type",
      "created_at",
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    // Use paginate() utility
    const result = await paginate({
      table: 'medical_records mr',
      page,
      limit,
      sort,
      sortTable: 'mr',
      filters: {
        'mr.patient_id': patientId,
        'mr.private': 'false',   // string 'false' → paginate boolean handler
        ...filters
      },
      select: `
        mr.id, mr.record_type, mr.description, mr.file_url, mr.created_at,
        mr.appointment_id, mr.doctor_id, du.full_name AS doctor_name
      `,
      join: `
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN users du ON d.user_id = du.id
      `
    });

    const records = (result.data || [])
      .filter(r => r.record_type !== 'prescription')
      .map(r => ({ ...r, description: decrypt(r.description) }));

    // Return paginated wrapper (same shape as getPrescriptions)
    res.json({ ...result, data: records });
  } catch (err) {
    console.error("[ERROR] Failed to fetch medical records:", err.stack);
    res.status(500).json({ message: "Internal server error" });
  }
};

// New: Get Patient Profile with ID for frontend pharmacy order fetching
exports.getPatientProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(`
      SELECT 
        u.id AS patient_id,
        p.blood_group,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        p.address,
        p.allergies,
        p.chronic_conditions,
        u.full_name,
        u.email,
        u.phone,
        u.gender,
        u.date_of_birth
      FROM users u
      JOIN patients p ON p.user_id = u.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ERROR] getPatientProfile:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPatientDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the patient ID from the user ID
    const patientResult = await db.query(
      'SELECT id FROM patients WHERE user_id = $1',
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const patientId = patientResult.rows[0].id;

    // Total appointments
    const appointmentsRes = await db.query(
      'SELECT COUNT(*) FROM appointments WHERE patient_id = $1',
      [patientId]
    );

    // Total orders
    const totalOrdersRes = await db.query(
      'SELECT COUNT(*) FROM pharmacy_orders WHERE patient_id = $1',
      [patientId]
    );

    // Pending orders
    const pendingOrdersRes = await db.query(
      `SELECT COUNT(*) FROM pharmacy_orders 
       WHERE patient_id = $1 AND status = 'pending'`,
      [patientId]
    );

    res.json({
      totalAppointments: parseInt(appointmentsRes.rows[0].count),
      totalOrders: parseInt(totalOrdersRes.rows[0].count),
      pendingOrders: parseInt(pendingOrdersRes.rows[0].count)
    });

  } catch (err) {
    console.error('[ERROR] getPatientDashboardStats:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPatientByUserId = async (req, res) => {
  const { userId } = req.params;

  if (parseInt(userId) !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
  }

  try {
    const result = await db.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ patient_id: result.rows[0].id });
  } catch (err) {
    console.error('[getPatientByUserId]', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
};
