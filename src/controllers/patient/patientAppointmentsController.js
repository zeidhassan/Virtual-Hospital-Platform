const pool = require('../../config/db');
const paginate = require('../../utils/pagination');
const { encrypt, decrypt } = require('../../utils/encrypt');
const { uploadMedicalRecord } = require('../../middleware/uploadMiddleware');

// Helper function to get day of week from a date
function getDayOfWeek(dateString) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(dateString).getDay()];
}

exports.getAvailableTimeSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Missing doctorId or date.' });
    }

    const dayOfWeek = getDayOfWeek(date); // Reuse helper from top of file

    // 1. Fetch all standard time slots for that day
    const slotsRes = await pool.query(
      `SELECT start_time, end_time FROM doctor_time_slots 
       WHERE doctor_id = $1 AND day_of_week = $2 
       ORDER BY start_time`,
      [doctorId, dayOfWeek]
    );

    const allSlots = slotsRes.rows;

    if (allSlots.length === 0) {
      return res.status(404).json({ error: 'No time slots found for the doctor on this day.' });
    }

    // 2. Fetch all existing appointments for that doctor on the date
    const bookedRes = await pool.query(
      `SELECT appointment_start_time, appointment_end_time 
       FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 
       AND status IN ('pending', 'confirmed')`,
      [doctorId, date]
    );

    const booked = bookedRes.rows;

    // 3. Filter out overlapping slots
    const availableSlots = allSlots.filter(slot => {
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;

      return !booked.some(appointment => {
        const apptStart = appointment.appointment_start_time;
        const apptEnd = appointment.appointment_end_time;

        return (
          slotStart < apptEnd && slotEnd > apptStart
        );
      });
    });

    res.json({ available_slots: availableSlots });
  } catch (err) {
    console.error('Error fetching available slots:', err);
    res.status(500).json({ error: 'Server error while fetching available slots.' });
  }
};

// Patient books an appointment
exports.createAppointment = async (req, res) => {
  uploadMedicalRecord.single('medical_record_file')(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(500).json({ error: 'Medical record file upload failed' });
    }

    try {
      if (req.user.role !== 'patient') {
        return res.status(403).json({ error: 'Access denied: Patients only.' });
      }

      const { doctor_id, appointment_date, appointment_start_time, appointment_end_time, notes, type, description } = req.body;
      const user_id = req.user.id;

      // Fetch patient ID
      const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [user_id]);
      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Patient record not found.' });
      }
      const patient_id = patientResult.rows[0].id;

      if (!doctor_id || !appointment_date || !appointment_start_time || !appointment_end_time) {
        return res.status(400).json({ error: 'Missing required fields.' });
      }

      const dayOfWeek = getDayOfWeek(appointment_date);

      // Check if doctor is available
      const timeSlotResult = await pool.query(
        `SELECT * FROM doctor_time_slots
       WHERE doctor_id = $1 AND day_of_week = $2
       AND start_time <= $3 AND end_time >= $4`,
        [doctor_id, dayOfWeek, appointment_start_time, appointment_end_time]
      );
      if (timeSlotResult.rows.length === 0) {
        return res.status(400).json({ error: 'Doctor is not available at the selected time.' });
      }

      // Check for overlapping appointments
      const overlapResult = await pool.query(
        `SELECT * FROM appointments
       WHERE doctor_id = $1
       AND appointment_date = $2
       AND ($3 < appointment_end_time AND $4 > appointment_start_time)
       AND status IN ('pending', 'confirmed')`,
        [doctor_id, appointment_date, appointment_start_time, appointment_end_time]
      );
      if (overlapResult.rows.length > 0) {
        return res.status(400).json({ error: 'Doctor already has an appointment at this time.' });
      }

      // Insert appointment
      const insertResult = await pool.query(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
        [patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, notes]
      );

      const appointment_id = insertResult.rows[0].id;

      // Fetch doctor user_id
      const doctorUserResult = await pool.query(
        'SELECT user_id FROM doctors WHERE id = $1',
        [doctor_id]
      );

      if (doctorUserResult.rows.length > 0) {
        const doctor_user_id = doctorUserResult.rows[0].user_id;

        // Create notification for doctor
        await pool.query(
          'INSERT INTO notifications (user_id, title, body) VALUES ($1, $2, $3)',
          [
            doctor_user_id,
            'New Appointment Booked',
            `A patient has booked an appointment on ${appointment_date} at ${appointment_start_time}.`,
          ]
        );
      }

      if (type) {
        const allowedRecordTypes = ['diagnosis', 'lab', 'scan', 'follow-up', 'vaccination'];

        if (!allowedRecordTypes.includes(type.toLowerCase())) {
          return res.status(400).json({
            error: `Invalid record type. Allowed types are: ${allowedRecordTypes.join(', ')}`
          });
        }

        const encryptedDescription = encrypt(description);

        if (req.file) {
          const filePath = `uploads/medical-records/${req.file.filename}`;
          await pool.query(
            `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, file_url, created_at, private)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), FALSE)`,
            [
              patient_id,
              doctor_id,
              appointment_id,
              type,
              encryptedDescription || 'No description provided',
              filePath
            ]
          );
        }
      }

      res.status(201).json(insertResult.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  });
};

// Get all specializations (unique)
exports.getSpecializations = async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT specialization FROM doctors ORDER BY specialization');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get doctors by specialization (join with users for names)
exports.getDoctorsBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;
    const result = await pool.query(
      `SELECT d.id AS doctor_id, u.full_name
       FROM doctors d
       INNER JOIN users u ON d.user_id = u.id
       WHERE d.specialization = $1
       ORDER BY u.full_name`,
      [specialization]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Patient views available time slots for a doctor
exports.getDoctorTimeSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const result = await pool.query(
      `SELECT * FROM doctor_time_slots WHERE doctor_id = $1 ORDER BY day_of_week, start_time`,
      [doctorId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Patient can view their own appointments
exports.getPatientAppointments = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get patient_id from user_id
    const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient record not found.' });
    }

    const patientId = patientResult.rows[0].id;

    // Read pagination params from query, fallback to defaults
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '-appointment_date';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "doctor_id",
      "appointment_date",
      "appointment_start_time",
      "appointment_end_time",
      "status",
      "notes"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    // Use the pagination utility
    const result = await paginate({
      table: 'appointments a',
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
        'u.full_name': req.query.name || undefined,
        ...filters
      },
      sort,
      sortTable: 'a',
      page,
      limit
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching appointments.' });
  }
};

// Patient can cancel upcoming appointment
exports.cancelAppointmentByPatient = async (req, res) => {
  try {
    const userId = req.user.id;
    const appointmentId = req.params.id;

    // Get patient_id
    const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient record not found.' });
    }
    const patientId = patientResult.rows[0].id;

    // Check appointment exists and is pending
    const apptResult = await pool.query(
      `SELECT * FROM appointments 
       WHERE id = $1 AND patient_id = $2 AND status = 'pending'`,
      [appointmentId, patientId]
    );
    if (apptResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized or invalid appointment.' });
    }

    const { doctor_id, appointment_date, appointment_start_time } = apptResult.rows[0];

    // Cancel the appointment
    await pool.query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1`,
      [appointmentId]
    );

    // Get doctor's user_id
    const doctorResult = await pool.query(
      'SELECT user_id FROM doctors WHERE id = $1',
      [doctor_id]
    );

    if (doctorResult.rows.length > 0) {
      const doctor_user_id = doctorResult.rows[0].user_id;

      // Insert notification for doctor
      await pool.query(
        `INSERT INTO notifications (user_id, title, body)
         VALUES ($1, $2, $3)`,
        [
          doctor_user_id,
          'Appointment Cancelled',
          `A patient has cancelled their appointment on ${appointment_date} at ${appointment_start_time}.`
        ]
      );
    }

    res.json({ message: 'Appointment cancelled and doctor notified.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while cancelling appointment.' });
  }
};

//NEW
exports.viewMedicalRecords = async (req, res) => {
  try {
    const userId = req.user.id;

    const { appointmentId } = req.params;

    // Get patient_id for this user
    const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient record not found.' });
    }
    const patientId = patientResult.rows[0].id;

    const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1 AND patient_id = $2', [appointmentId, patientId]);
    if (appointmentResult.rows.length === 0) return res.status(403).json({ error: 'Unauthorized.' });

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-created_at';

    // Fetch only public medical records
    const result = await paginate({
      table: 'medical_records mr',
      page,
      limit,
      sort,
      sortTable: 'mr',
      select: `
        mr.id, mr.record_type, mr.description, mr.file_url, mr.created_at,
        a.appointment_date, a.appointment_start_time, a.appointment_end_time,
        u.full_name AS doctor_name
      `,
      join: `
        LEFT JOIN appointments a ON mr.appointment_id = a.id
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
      `,
      filters: {
        'appointment_id': appointmentId,
        'mr.private': false
      }
    });

    // Decrypt descriptions
    const records = (result.data || []).map(rec => ({
      ...rec,
      description: decrypt(rec.description)
    }));

    res.json({
      ...result,
      data: records
    });
  } catch (err) {
    console.error('Error fetching medical records:', err);
    res.status(500).json({ error: 'Server error while fetching medical records.' });
  }
};

// NEW
exports.getPrescribedMedications = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    // Check if the appointment is completed
    const appointmentCheck = await pool.query(
      `SELECT status FROM appointments WHERE id = $1`,
      [appointmentId]
    );

    if (appointmentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointmentCheck.rows[0].status.toLowerCase() !== 'completed') {
      return res.status(400).json({ error: 'Prescription can only be added after appointment is marked as completed.' });
    }

    const result = await paginate({
      table: 'prescriptions',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '+id',
      sortTable: 'p',
      join: `
        As p JOIN medications m ON p.medication = m.name
      `,
      select: `
        p.id, p.appointment_id, p.medication, p.dosage, p.instructions, p.pack_limit, p.limit_reached, m.price
      `,
      filters: {
        "appointment_id": req.params.appointmentId,
      }
    });
    res.json(result);
  } catch (err) {
    console.error('[getAllOrders]', err.message);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

// NEW
exports.buyMedication = async (req, res) => {
  const { appointmentId } = req.params;

  const { name } = req.body;

  // Check if the appointment is completed
  const appointmentCheck = await pool.query(
    `SELECT status FROM appointments WHERE id = $1`,
    [appointmentId]
  );

  if (appointmentCheck.rowCount === 0) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  if (appointmentCheck.rows[0].status.toLowerCase() !== 'completed') {
    return res.status(400).json({ error: 'Prescription can only be added after appointment is marked as completed.' });
  }

  // Fetch patient ID from authenticated user
  const patientRes = await pool.query(
    'SELECT id FROM patients WHERE user_id = $1',
    [req.user.id]
  );

  if (patientRes.rowCount === 0) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const patientId = patientRes.rows[0].id;

  const prescriptionQuery = `
    SELECT medication, dosage, pack_limit, limit_reached 
    FROM prescriptions 
    WHERE appointment_id = $1 
      AND LOWER(medication) = LOWER($2)
  `;

  const historyQuery = `
    SELECT COUNT(*)
    FROM pharmacy_orders po
    JOIN prescriptions p ON
      ',' || LOWER(po.medications) || ',' LIKE '%,' || LOWER(p.medication) || ',%'
    WHERE po.patient_id = $1
      AND LOWER(p.medication) = LOWER($2)
      AND po.status = 'delivered'
      AND po.ordered_at BETWEEN p.issued_date AND NOW();
  `;

  const medicationQuery = `
    SELECT price 
    FROM medications 
    WHERE LOWER(name) = LOWER($1)
  `;

  const OrderQuery = `
    INSERT INTO pharmacy_orders (patient_id, medications, total_amount, status, prescription_file, ordered_at)
    VALUES ($1, $2, $3, 'approved', $4, NOW())
    RETURNING *
  `;

  const medicationInfo = await pool.query(prescriptionQuery, [appointmentId, name]);

  if (medicationInfo.rows.length === 0) {
    return res.status(404).json({ error: 'Medication not found in prescriptions.' });
  }

  const { medication, dosage, pack_limit, limit_reached } = medicationInfo.rows[0];

  // Check if medication limit is reached
  if (limit_reached) {
    return res.status(403).json({ error: 'Medication limit reached for this prescription.' });
  }

  const historyCount = await pool.query(historyQuery, [patientId, name]);

  if (parseInt(historyCount.rows[0].count) >= pack_limit) {
    // Update prescription to mark limit as reached
    await pool.query(`
      UPDATE prescriptions 
      SET limit_reached = TRUE 
      WHERE appointment_id = $1 AND LOWER(medication) = LOWER($2)
    `, [appointmentId, name]);
    return res.status(403).json({ error: 'Medication purchase limit reached for this medication.' });
  }

  const medicationPrice = await pool.query(medicationQuery, [name]);
  if (medicationPrice.rows.length === 0) {
    return res.status(404).json({ error: 'Medication not found.' });
  }

  const { price } = medicationPrice.rows[0];
  const prescriptionDetails = `${medication} (${dosage})`;

  // Create a new order
  const order = await pool.query(OrderQuery, [patientId, name, price, prescriptionDetails]);
  res.status(201).json({ message: 'Medication ordered successfully.', order: order.rows[0] });
};