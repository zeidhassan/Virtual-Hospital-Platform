const pool = require('../../config/db');
const paginate = require('../../utils/pagination');
const fs = require('fs');
const path = require('path');
const { uploadMedicalRecord } = require('../../middleware/uploadMiddleware');
const { encrypt, decrypt } = require('../../utils/encrypt');

exports.addMedicalRecord = async (req, res) => {
  const { appointmentId } = req.params;
  const { record_type, description, private } = req.body;

  const allowedRecordTypes = ['medical-history', 'patient-profile', 'doctor-notes', 'diagnosis', 'scan', 'lab-result', 'xray', 'blood-test', 'blood-readings', 'radio-reports', 'prescription', 'health-report', 'vaccination', 'referral', 'follow-up', 'bill', 'payment'];

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

    if (!allowedRecordTypes.includes(record_type.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid record type. Allowed types are: ${allowedRecordTypes.join(', ')}`
      });
    }

    uploadMedicalRecord.single('file')(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err.message);
        return res.status(400).json({ error: 'File upload failed: ' + err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Fetch patient_id and doctor_id from appointments table
      const appointmentRes = await pool.query(
        `SELECT patient_id, doctor_id FROM appointments WHERE id = $1`,
        [appointmentId]
      );

      if (appointmentRes.rowCount === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const { patient_id: patientId, doctor_id: doctorId } = appointmentRes.rows[0];
      const fileUrl = `uploads/medical-records/${req.file.filename}`;

      const encryptedDescription = encrypt(description)

      const result = await pool.query(
        `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, file_url, created_at, private)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
         RETURNING *`,
        [patientId, doctor_id, appointment_id, record_type, encryptedDescription, fileUrl, private]
      );

      res.status(201).json({
        message: 'Medical record added successfully',
        data: result.rows[0]
      });
    });
  } catch (err) {
    console.error('Error adding medical record:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /medical-records/patient/:id
exports.getRecordsByPatient = async (req, res) => {
  const { id } = req.params;

  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '-created_at';
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      table: 'medical_records',
      page,
      limit,
      sort,
      sortTable: 'mr',
      select: 'mr.*',
      filters: {
        'mr.patient_id': id,
        'mr.record_type': req.query.record_type || undefined,
        'mr.private': FALSE
      }
    });

    const records = result.rows.map(r => ({
      ...r,
      description: decrypt(r.description)
    }));

    res.status(200).json(records);
  } catch (err) {
    console.error('Error fetching patient records:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /medical-records/doctor/:id
exports.getRecordsByDoctor = async (req, res) => {
  const { id } = req.params;

  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '-created_at';
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      table: 'medical_records',
      page,
      limit,
      sort,
      sortTable: 'mr',
      select: 'mr.*',
      filters: {
        'mr.doctor_id': id,
        'mr.record_type': req.query.record_type || undefined,
      }
    });

    const records = result.rows.map(r => ({
      ...r,
      description: decrypt(r.description)
    }));

    res.status(200).json(records);
  } catch (err) {
    console.error('Error fetching doctor records:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /medical-records/:id
exports.deleteRecord = async (req, res) => {
  const role = req.user?.role;

  const { id } = req.params;
  try {
    const result = await pool.query('SELECT file_url FROM medical_records WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Record not found' });

    const filePath = path.join(__dirname, '../../', result.rows[0].file_url);
    fs.unlink(filePath, async (err) => {
      if (err) console.warn('File may not exist:', err.message);
      await pool.query('DELETE FROM medical_records WHERE id = $1', [id]);
      res.status(200).json({ message: 'Medical record deleted' });
    });
  } catch (err) {
    console.error('Error deleting medical record:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
