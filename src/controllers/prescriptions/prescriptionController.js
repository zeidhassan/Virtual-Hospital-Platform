const pool = require('../../config/db');
const paginate = require('../../utils/pagination');
const { encrypt, decrypt } = require('../../utils/encrypt');

// POST /prescriptions
exports.addPrescription = async (req, res) => {
  const appointmentId = req.body.appointment_id;
  const { medication, dosage, pack_limit, instructions, issued_date } = req.body;

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

// GET /prescriptions/patient/:id
exports.getPrescriptionsByPatient = async (req, res) => {
  const { id } = req.params;

  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '-issued_date';
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      table: 'prescriptions',
      page,
      limit,
      sort,
      sortTable: 'p',
      select: 'p.*',
      join: 'JOIN appointments a ON p.appointment_id = a.id',
      filters: {
        'a.patient_id': id,
        'p.medication': req.query.medication || undefined,
      }
    });

    const prescriptions = (result.data || []).map(p => ({
      ...p,
      instructions: decrypt(p.instructions)
    }));

    res.status(200).json({
      ...result,
      data: prescriptions
    });
  } catch (err) {
    console.error('Error fetching patient prescriptions:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /prescriptions/doctor/:id
exports.getPrescriptionsByDoctor = async (req, res) => {
  const { id } = req.params;

  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '-issued_date';
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      table: 'prescriptions',
      page,
      limit,
      sort,
      sortTable: 'p',
      select: 'p.*',
      join: 'JOIN appointments a ON p.appointment_id = a.id',
      filters: {
        'a.doctor_id': id,
        'p.medication': req.query.medication || undefined,
      }
    });

    const prescriptions = result.rows.map(p => ({
      ...p,
      instructions: decrypt(p.instructions)
    }));

    res.status(200).json(prescriptions);
  } catch (err) {
    console.error('Error fetching doctor prescriptions:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /prescriptions/:id
exports.deletePrescription = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM prescriptions WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Prescription not found' });

    await pool.query('DELETE FROM prescriptions WHERE id = $1', [id]);
    res.status(200).json({ message: 'Prescription deleted' });
  } catch (err) {
    console.error('Error deleting prescription:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
