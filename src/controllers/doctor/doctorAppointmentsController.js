const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const pool = require('../../config/db');
const { encrypt, decrypt } = require('../../utils/encrypt');
const { uploadMedicalRecord } = require('../../middleware/uploadMiddleware');
const paginate = require('../../utils/pagination')

exports.getDoctorAppointments = async (req, res) => {
  const userId = req.user.id;
  const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
  if (doctorResult.rows.length === 0) return res.status(404).json({ error: 'Doctor not found.' });
  const doctorId = doctorResult.rows[0].id;

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-appointment_date';

    const validColumns = [
      "appointment_id",
      "patient_id",
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

    const result = await paginate({
      table: 'appointments a',
      page,
      sort,
      limit,
      sortTable: 'a',
      select: 'a.id, a.appointment_date, a.appointment_start_time, a.appointment_end_time, a.status, a.notes, u.full_name AS patient_name, a.patient_id',
      join: `
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON p.user_id = u.id
      `,
      filters: {
        'a.doctor_id': doctorId,
        'u.full_name': req.query.name || undefined,
        ...filters
      }

    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    if (doctorResult.rows.length === 0) return res.status(404).json({ error: 'Doctor not found.' });
    const doctorId = doctorResult.rows[0].id;

    const appointmentCheck = await pool.query('SELECT * FROM appointments WHERE id = $1 AND doctor_id = $2', [id, doctorId]);
    if (appointmentCheck.rows.length === 0) return res.status(403).json({ error: 'Unauthorized.' });

    await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [status, id]);

    // Notification logic
    const patientId = appointmentCheck.rows[0].patient_id;
    const patientUserRes = await pool.query('SELECT user_id FROM patients WHERE id = $1', [patientId]);
    if (patientUserRes.rows.length > 0) {
      const patientUserId = patientUserRes.rows[0].user_id;
      await pool.query(
        'INSERT INTO notifications (user_id, title, body) VALUES ($1, $2, $3)',
        [
          patientUserId,
          'Appointment Status Updated',
          `Your appointment on ${appointmentCheck.rows[0].appointment_date} has been marked as ${status}.`
        ]
      );
    }

    res.json({ message: 'Status updated and patient notified.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getAppointmentRecords = async (req, res) => {
  try {
    const userId = req.user.id;

    const { appointmentId } = req.params;

    // Get doctorId from userId
    const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }
    const doctorId = doctorResult.rows[0].id;

    const appointmentResult = await pool.query('SELECT patient_id FROM appointments WHERE id = $1 AND doctor_id = $2', [appointmentId, doctorId]);
    if (appointmentResult.rows.length === 0) return res.status(403).json({ error: 'Unauthorized.' });

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const isPrivate = req.query.private || undefined;

    const result = await paginate({
      table: 'medical_records mr',
      page,
      limit,
      sort: '-created_at',
      sortTable: 'mr',
      select: `
        mr.id, mr.patient_id, mr.doctor_id, mr.appointment_id, mr.record_type,
        mr.description, mr.file_url, mr.created_at,
        p.id AS patient_id, u.full_name AS patient_name,
        a.appointment_date, a.appointment_start_time, a.appointment_end_time
      `,
      join: `
        JOIN patients p ON mr.patient_id = p.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN appointments a ON mr.appointment_id = a.id
      `,
      filters: {
        'appointment_id': appointmentId,
        'private': isPrivate
      },
    });

    const medicalRecords = (result.data || []).map(mr => ({
      ...mr,
      description: decrypt(mr.description)
    }));

    res.json({
      ...result,
      data: medicalRecords // Replace encrypted data with decrypted
    });
  } catch (err) {
    console.error('Error fetching medical records:', err);
    res.status(500).json({ error: 'Server error fetching records.' });
  }
};

exports.addMedicalRecord = async (req, res) => {
  uploadMedicalRecord.single('medical_record_file')(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(500).json({ error: 'Medical record file upload failed' });
    }

    const userId = req.user.id;
    const { appointmentId } = req.params;
    const { type, description, private: isPrivate } = req.body;

    const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    if (doctorResult.rows.length === 0) return res.status(404).json({ error: 'Doctor not found.' });
    const doctorId = doctorResult.rows[0].id;

    const appointmentResult = await pool.query('SELECT patient_id FROM appointments WHERE id = $1 AND doctor_id = $2', [appointmentId, doctorId]);
    if (appointmentResult.rows.length === 0) return res.status(403).json({ error: 'Unauthorized.' });

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
        return res.status(400).json({ error: 'Medical Records can only be added after appointment is marked as completed.' });
      }

      const encryptedDescription = encrypt(description);

      const patientId = appointmentResult.rows[0].patient_id;

      const allowedRecordTypes = [
        'medical-history', 'patient-profile', 'doctor-notes', 'diagnosis', 'scan', 'lab-result', 'xray', 'blood-test',
        'blood-readings', 'radio-reports', 'prescription', 'health-report', 'vaccination', 'referral', 'follow-up', 'bill', 'payment'
      ];
      if (!allowedRecordTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid record type.' });
      }

      let result;

      if (req.file) {
        const filePath = `uploads/medical-records/${req.file.filename}`;
        result = await pool.query(
          `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, file_url, created_at, private)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
          [
            patientId,
            doctorId,
            appointmentId,
            type,
            encryptedDescription || 'No description provided',
            filePath,
            isPrivate
          ]
        );
      } else {
        result = await pool.query(
          `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, created_at, private)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)
           RETURNING *`,
          [
            patientId,
            doctorId,
            appointmentId,
            type,
            encryptedDescription || 'No description provided',
            isPrivate
          ]
        );
      }

      res.status(201).json({
        message: 'Medical Record added',
        data: result.rows[0],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  });
};

const allowedRecordTypes = [
  'medical-history', 'patient-profile', 'doctor-notes', 'diagnosis', 'scan', 'lab-result', 'xray', 'blood-test',
  'blood-readings', 'radio-reports', 'prescription', 'health-report', 'vaccination', 'referral', 'follow-up', 'bill', 'payment'
];

async function generateMedicalRecordFile(recordType, text, doctorId, patientId, appointmentId) {
  const folder = 'uploads/medical-records/';
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const filename = `medrec_${recordType}_${doctorId}_${patientId}_${appointmentId}_${Date.now()}.pdf`;
  const filepath = path.join(folder, filename);
  const doc = new PDFDocument();

  const writeStream = fs.createWriteStream(filepath);
  doc.pipe(writeStream);

  // Custom content for each record type
  let content = '';
  switch (recordType) {
    case 'medical-history': // not done
      content = `Medical History for patient #${patientId}.\nIncludes all past diagnoses, surgeries, and chronic conditions.`;
      break;
    case 'patient-profile': // not done
      content = `Patient Profile: Overview for patient #${patientId}.\nDemographics, contact, and basic health info.`;
      break;
    case 'doctor-notes': // done
      content = `Doctor's Notes from appointment #${appointmentId}.\nObservations and recommendations by doctor #${doctorId}.\n${text}`;
      break;
    case 'diagnosis': // done
      content = `Diagnosis Report from appointment #${appointmentId} by doctor #${doctorId}.\nAssessment, ICD code, and summary of findings.\n${text}`;
      break;
    case 'scan': // not done
      content = `Scan Results.\nSummary and interpretation of radiology scan.`;
      break;
    case 'lab-result': // not done
      content = `Lab Results.\nComplete list of all labs conducted and findings.`;
      break;
    case 'xray': // not done
      content = `X-ray Report.\nInterpretation of radiographic images.`;
      break;
    case 'blood-test': // not done
      content = `Blood Test Results.\nPanel, reference values, and any abnormalities.`;
      break;
    case 'blood-readings': // not done
      content = `Blood Readings.\nRecorded measurements and trends.`;
      break;
    case 'radio-reports': // not done
      content = `Radiology Report.\nImaging findings and radiologist summary.`;
      break;
    case 'prescription': // done
      content = `Prescription Sheet.\nList of medications prescribed for this visit.\n${text}`;
      break;
    case 'health-report': // done
      content = `General Health Report.\nOverall health status and screening results.\n${text}`;
      break;
    case 'vaccination': // not done
      content = `Vaccination Record.\nType, date, and provider of administered vaccine.`;
      break;
    case 'referral': // done
      content = `Referral Form.\nSpecialist, reason, and supporting documents.\n${text}`;
      break;
    case 'follow-up': // done
      content = `Follow-up Summary.\nNext steps, monitoring plan, and contact info.\n${text}`;
      break;
    case 'bill': // done
      content = `Billing Statement.\nAll charges, insurance, and payment summary.\n${text}`;
      break;
    case 'payment': // not done
      content = `Payment Confirmation.\nReceipt and transaction details.`;
      break;
    default:
      content = `Generic medical record for type: ${recordType}.`;
  }
  doc.fontSize(14).text(content, { align: 'left' });
  doc.end();

  // Return a promise that resolves to the file path when writing is done
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(filepath));
    writeStream.on('error', reject);
  });
}

exports.generateMedicalRecord = async (req, res) => {
  const userId = req.user.id;
  const { appointmentId } = req.params;
  let { type, text, private: isPrivate } = req.body;
  try {
    // Validation: Doctor and Appointment Auth
    const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    if (doctorResult.rows.length === 0) return res.status(404).json({ error: 'Doctor not found.' });
    const doctorId = doctorResult.rows[0].id;

    const appointmentResult = await pool.query('SELECT patient_id, status FROM appointments WHERE id = $1 AND doctor_id = $2', [appointmentId, doctorId]);
    if (appointmentResult.rows.length === 0) return res.status(403).json({ error: 'Unauthorized.' });

    if (appointmentResult.rows[0].status.toLowerCase() !== 'completed') {
      return res.status(400).json({ error: 'Medical Records can only be added after appointment is marked as completed.' });
    }

    const patientId = appointmentResult.rows[0].patient_id;
    type = String(type).toLowerCase();

    if (!allowedRecordTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid record type.' });
    }

    // System-generated standard description
    const description = `This is a system-generated record for ${type}.`;

    // Generate the PDF file
    const filePath = await generateMedicalRecordFile(type, text, doctorId, patientId, appointmentId);

    const insertResult = await pool.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, file_url, created_at, private)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       RETURNING *`,
      [
        patientId,
        doctorId,
        appointmentId,
        type,
        encrypt(description),
        filePath,
        isPrivate
      ]
    );

    res.status(201).json({
      message: 'Medical Record generated and added',
      data: insertResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.addPrescription = async (req, res) => {
  const userId = req.user.id;
  const { appointmentId } = req.params;
  const { medication, dosage, pack_limit, instructions, issued_date } = req.body;

  const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
  if (doctorResult.rows.length === 0) return res.status(404).json({ error: 'Doctor not found.' });
  const doctorId = doctorResult.rows[0].id;

  const appointmentCheck = await pool.query('SELECT * FROM appointments WHERE id = $1 AND doctor_id = $2', [appointmentId, doctorId]);
  if (appointmentCheck.rows.length === 0) return res.status(403).json({ error: 'Unauthorized.' });

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

    const encryptedInstructions = encrypt(instructions);

    // Insert prescription
    const result = await pool.query(
      `INSERT INTO prescriptions (appointment_id, medication, dosage, pack_limit, instructions, issued_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [appointmentId, medication, dosage, pack_limit, encryptedInstructions, issued_date]
    );

    res.status(201).json({
      message: 'Prescription added',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error adding prescription:', err);
    res.status(500).json({ error: 'Server error' });
  }
};