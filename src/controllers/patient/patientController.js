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

    const result = await paginate({
      table: 'appointments a',
      page,
      limit,
      sort,
      sortTable: 'a',
      select: `
        a.id, a.appointment_date, a.appointment_start_time, a.appointment_end_time,
        a.status, a.notes,
        u.full_name AS doctor_name, d.specialization
      `,
      join: `
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
      `,
      filters: {
        'a.patient_id': patientId,
        'a.status': status
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
      "medication",
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
      `,
      select: `
        p.id, p.appointment_id, p.medication, p.dosage, p.instructions,
        p.pack_limit, p.limit_reached, p.issued_date
      `
    });

    res.json(result);
  } catch (err) {
    console.error('[ERROR] getPrescriptions:', err);
    res.status(500).json({ message: 'Failed to fetch prescriptions' });
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
    console.log("[DEBUG] Request received for medical records");

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
        'mr.private': false,
        ...filters
      },
      select: `
        mr.id, mr.record_type, mr.description, mr.file_url, mr.created_at,
        mr.appointment_id, mr.doctor_id
      `
    });

    const records = result.rows.map(r => ({
      ...r,
      description: decrypt(r.description)
    }));

    res.json(records);
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
