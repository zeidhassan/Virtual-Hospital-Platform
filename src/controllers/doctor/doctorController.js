const pool = require('../../config/db');
const paginate = require('../../utils/pagination')
const { encrypt, decrypt } = require('../../utils/encrypt');

// Get patients assigned to the doctor
exports.getDoctorPatients = async (req, res) => {
  const userId = req.user.id;

  try {
    const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    if (doctorResult.rows.length === 0) return res.status(404).json({ error: 'Doctor not found.' });
    const doctorId = doctorResult.rows[0].id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      'blood_group',
      'emergency_contact_name',
      'emergency_contact_phone',
      'address',
      'allergies',
      'chronic_conditions'
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'patients',
      page,
      sort: 'id',
      limit,
      sortTable: 'patients',
      select: 'DISTINCT ON (patients.id) patients.id, u.full_name, u.email, patients.blood_group, patients.allergies, patients.chronic_conditions',
      join: `
        JOIN users u ON patients.user_id = u.id
        JOIN appointments a ON a.patient_id = patients.id
      `,
      filters: {
        'a.doctor_id': doctorId,
        'u.full_name': req.query.name || undefined,
        ...filters
      }

    });
    res.json(result);
  } catch (err) {
    console.error('[ERROR] getDoctorPatients:', err);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
};

exports.getPatientDetailsById = async (req, res) => {
  try {
    const userId = req.user.id;                  // authenticated user (doctor)
    const { patientId } = req.params;

    // Basic validation
    if (!patientId || isNaN(Number(patientId))) {
      return res.status(400).json({ error: 'Invalid patient ID.' });
    }

    // 1) Resolve doctor_id from authenticated user
    const docRes = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [userId]
    );
    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }
    const doctorId = docRes.rows[0].id;

    // 2) Validate relationship: patient must have (at least one) appointment with this doctor
    const linkRes = await pool.query(
      `SELECT 1 FROM appointments 
       WHERE doctor_id = $1 AND patient_id = $2 
       LIMIT 1`,
      [doctorId, patientId]
    );
    if (linkRes.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized: patient is not linked to this doctor.' });
    }

    // 3) Fetch patient profile (join patients + users)
    const patientRes = await pool.query(
      `SELECT 
         p.id AS patient_id,
         u.full_name, u.email, u.phone, u.gender, u.date_of_birth,
         p.blood_group, p.emergency_contact_name, p.emergency_contact_phone,
         p.address, p.allergies, p.chronic_conditions
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [patientId]
    );

    if (patientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    res.json(patientRes.rows[0]);
  } catch (err) {
    console.error('[ERROR] getPatientInfoById:', err);
    res.status(500).json({ error: 'Server error fetching patient info.' });
  }
};

exports.getPatientStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get the doctor's ID
    const doctorResult = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [userId]
    );
    if (doctorResult.rowCount === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const doctorId = doctorResult.rows[0].id;

    // 2. Count distinct patients linked to the doctor's appointments
    const statsResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT p.id) AS total_patients,
         COUNT(DISTINCT p.id) FILTER (WHERE p.allergies IS NOT NULL AND TRIM(p.allergies) <> '') AS patients_with_allergies
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = $1`,
      [doctorId]
    );

    res.json(statsResult.rows[0]);
  } catch (err) {
    console.error('[ERROR] getPatientStats:', err);
    res.status(500).json({ error: 'Failed to fetch patient stats.' });
  }
};

exports.getAppointmentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get the doctor's ID
    const doctorResult = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [userId]
    );
    if (doctorResult.rowCount === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const doctorId = doctorResult.rows[0].id;

    // 2. Aggregate appointment status counts
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed
       FROM appointments
       WHERE doctor_id = $1`,
      [doctorId]
    );

    res.json(statsResult.rows[0]);
  } catch (err) {
    console.error('[ERROR] getAppointmentStats:', err);
    res.status(500).json({ error: 'Failed to fetch appointment stats.' });
  }
};

// Get medical records for patients assigned to the doctor
// Every record for every patient this doctor is linked to (via any appointment),
// not just records this doctor personally created — 'private' only gates the
// patient's own view of a record, so it doesn't restrict doctor-to-doctor visibility.
exports.getMedicalRecords = async (req, res) => {
  try {
    const userId = req.user.id;

    const doctorResult = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rowCount === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const doctorId = doctorResult.rows[0].id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const conditions = [
      `mr.patient_id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = $1)`,
    ];
    const params = [doctorId];

    if (req.query.patient_id) {
      params.push(req.query.patient_id);
      conditions.push(`mr.patient_id = $${params.length}`);
    }
    if (req.query.record_type) {
      params.push(req.query.record_type);
      conditions.push(`mr.record_type = $${params.length}`);
    }
    if (req.query.name) {
      params.push(`%${req.query.name.toLowerCase()}%`);
      conditions.push(`LOWER(u.full_name) LIKE $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const dataRes = await pool.query(
      `SELECT mr.id, mr.record_type, mr.description, mr.file_url, mr.created_at, mr.private,
              mr.patient_id, mr.doctor_id, u.full_name AS patient_name, du.full_name AS created_by_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN doctors d ON mr.doctor_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       ${where}
       ORDER BY mr.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const data = dataRes.rows.map(r => ({ ...r, description: decrypt(r.description) }));

    res.json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      totalItems: total,
      data,
    });
  } catch (err) {
    console.error('[ERROR] getMedicalRecords:', err);
    res.status(500).json({ error: 'Failed to fetch medical records.' });
  }
};

// Doctor uploads a medical record directly for a linked patient — not tied to
// any specific appointment (appointment_id is optional, for when they do want
// to reference a particular visit).
exports.addPatientRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const { patientId } = req.params;
    const { record_type, description, appointment_id, private: isPrivate } = req.body;

    const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    if (doctorResult.rowCount === 0) return res.status(404).json({ error: 'Doctor not found.' });
    const doctorId = doctorResult.rows[0].id;

    const linkCheck = await pool.query(
      'SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1',
      [doctorId, patientId]
    );
    if (linkCheck.rowCount === 0) {
      return res.status(403).json({ error: 'You are not linked to this patient.' });
    }

    if (!record_type) {
      return res.status(400).json({ error: 'record_type is required.' });
    }

    let linkedAppointmentId = null;
    if (appointment_id) {
      const apptCheck = await pool.query(
        'SELECT id FROM appointments WHERE id = $1 AND doctor_id = $2 AND patient_id = $3',
        [appointment_id, doctorId, patientId]
      );
      if (apptCheck.rowCount === 0) {
        return res.status(400).json({ error: 'That appointment does not belong to this doctor/patient pair.' });
      }
      linkedAppointmentId = appointment_id;
    }

    const filePath = req.file ? `uploads/medical-records/${req.file.filename}` : null;
    const encryptedDescription = encrypt(description || '');

    const result = await pool.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, file_url, created_at, private)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7) RETURNING *`,
      [patientId, doctorId, linkedAppointmentId, record_type, encryptedDescription, filePath, isPrivate === 'true' || isPrivate === true]
    );

    res.status(201).json({ message: 'Medical record added', data: result.rows[0] });
  } catch (err) {
    console.error('[ERROR] addPatientRecord:', err);
    res.status(500).json({ error: 'Failed to add medical record.' });
  }
};

// Update a medical record by doctor — only the doctor who created it may edit it.
exports.updateMedicalRecord = async (req, res) => {
  const { id } = req.params;
  const { record_type, description, private: isPrivate } = req.body;
  try {
    const userId = req.user.id;

    // Get doctor_id from user_id
    const doctorResult = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rowCount === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const doctorId = doctorResult.rows[0].id;

    const encryptedDescription = encrypt(description);

    const result = await pool.query(
      `UPDATE medical_records
       SET record_type = $1, description = $2, private = $3
       WHERE id = $4 AND doctor_id = $5
       RETURNING *`,
      [record_type, encryptedDescription, isPrivate, id, doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized or record not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ERROR] updateMedicalRecord:', err);
    res.status(500).json({ error: 'Failed to update medical record.' });
  }
};

// Update a prescription by doctor — ownership resolved through the
// prescription's own appointment, since prescriptions has no patient_id
// column (only appointment_id).
exports.updatePrescription = async (req, res) => {
  const { id } = req.params;
  const { medication_id, dosage, pack_limit, instructions, limit_reached } = req.body;
  try {
    const userId = req.user.id;

    // Get doctor_id from user_id
    const doctorResult = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [userId]
    );

    if (doctorResult.rowCount === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const doctorId = doctorResult.rows[0].id;

    // Ensure this prescription belongs to one of this doctor's own appointments
    const check = await pool.query(
      `SELECT pr.* FROM prescriptions pr
       JOIN appointments a ON pr.appointment_id = a.id
       WHERE pr.id = $1 AND a.doctor_id = $2`,
      [id, doctorId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized or prescription not found.' });
    }

    if (medication_id) {
      const medRes = await pool.query('SELECT id FROM medications WHERE id = $1', [medication_id]);
      if (medRes.rows.length === 0) {
        return res.status(404).json({ error: 'Medication not found.' });
      }
    }

    const encryptedInstructions = encrypt(instructions);

    const result = await pool.query(
      `UPDATE prescriptions
       SET medication_id = COALESCE($1, medication_id), dosage = $2, pack_limit = $3, instructions = $4, issued_date = NOW(), limit_reached = $5
       WHERE id = $6 RETURNING *`,
      [medication_id || null, dosage, pack_limit, encryptedInstructions, limit_reached, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ERROR] updatePrescription:', err);
    res.status(500).json({ error: 'Failed to update prescription.' });
  }
};

// Get all prescriptions for patients assigned to the doctor
exports.getPrescriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: Get doctor_id
    const doctorRes = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [userId]
    );
    if (doctorRes.rowCount === 0) {
      return res.status(404).json({ error: 'Doctor not found for this user.' });
    }

    const doctorId = doctorRes.rows[0].id;

    // Step 2: Parse pagination and sorting params
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

    // Step 3: Use JOIN to filter prescriptions based on doctor-owned appointments
    const result = await paginate({
      table: 'prescriptions p',
      page,
      limit,
      sort,
      sortTable: 'p',
      select: `
        p.id, p.appointment_id, m.name AS medication, p.medication_id, p.dosage, p.instructions,
        p.pack_limit, p.refills_used, p.limit_reached, p.issued_date,
        u.full_name AS patient_name
      `,
      join: `
        JOIN appointments a ON p.appointment_id = a.id
        JOIN patients pt ON a.patient_id = pt.id
        JOIN users u ON pt.user_id = u.id
        JOIN medications m ON p.medication_id = m.id
      `,
      filters: {
        'a.doctor_id': doctorId,
        'u.full_name': req.query.name || undefined,
        ...filters
      }
    });

    const prescriptions = (result?.data || []).map(p => ({
      ...p,
      instructions: decrypt(p.instructions)
    }));

    res.json({
      ...result,
      data: prescriptions
    });
  } catch (err) {
    console.error('[ERROR] getPrescriptions:', err);
    res.status(500).json({ error: 'Failed to retrieve prescriptions.' });
  }
};
