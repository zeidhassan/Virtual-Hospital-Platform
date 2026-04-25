const pool = require('../../config/db');
const paginate = require('../../utils/pagination');
const handleDbError = require('../../utils/handleDbError');

// POST /api/follow-ups — doctor or admin creates a follow-up
exports.createFollowUp = async (req, res) => {
  const { patient_id, appointment_id, scheduled_date, notes } = req.body;

  if (!patient_id || !scheduled_date) {
    return res.status(400).json({ error: 'patient_id and scheduled_date are required' });
  }

  try {
    let resolvedDoctorId = null;
    if (req.user.role === 'doctor') {
      const docRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (docRow.rows.length === 0) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }
      resolvedDoctorId = docRow.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO follow_up_schedules
         (patient_id, doctor_id, appointment_id, created_by, scheduled_date, notes, status, reminder_sent)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', FALSE)
       RETURNING *`,
      [patient_id, resolvedDoctorId, appointment_id || null, req.user.id, scheduled_date, notes || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// GET /api/follow-ups/my — patient views own follow-ups
exports.getMyFollowUps = async (req, res) => {
  try {
    const patientRow = await pool.query(
      'SELECT id FROM patients WHERE user_id = $1', [req.user.id]
    );
    if (patientRow.rows.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }
    const patientId = patientRow.rows[0].id;

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort  = req.query.sort || '-scheduled_date';

    const result = await paginate({
      table: 'follow_up_schedules',
      page, limit, sort,
      filters: { patient_id: patientId, ...(req.query.status ? { status: req.query.status } : {}) },
    });
    return res.json(result);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// GET /api/follow-ups/doctor — doctor views follow-ups they assigned
exports.getDoctorFollowUps = async (req, res) => {
  try {
    const doctorRow = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1', [req.user.id]
    );
    if (doctorRow.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }
    const doctorId = doctorRow.rows[0].id;

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort  = req.query.sort || '-scheduled_date';

    const result = await paginate({
      table: 'follow_up_schedules',
      page, limit, sort,
      filters: { doctor_id: doctorId, ...(req.query.status ? { status: req.query.status } : {}) },
    });
    return res.json(result);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// GET /api/follow-ups/admin — admin views all follow-ups with optional filters
exports.getAllFollowUps = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort  = req.query.sort || '-scheduled_date';

    const validFilters = ['patient_id', 'doctor_id', 'status', 'reminder_sent'];
    const filters = {};
    for (const key of validFilters) {
      if (req.query[key] !== undefined) filters[key] = req.query[key];
    }

    const result = await paginate({
      table: 'follow_up_schedules',
      page, limit, sort, filters,
    });
    return res.json(result);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// PUT /api/follow-ups/:id/complete — patient or doctor marks complete
exports.completeFollowUp = async (req, res) => {
  const { id } = req.params;

  try {
    const row = await pool.query('SELECT * FROM follow_up_schedules WHERE id = $1', [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Follow-up not found' });

    const fu = row.rows[0];

    // Patient can only complete their own; doctor can complete any they are assigned to
    if (req.user.role === 'patient') {
      const patientRow = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
      if (patientRow.rows.length === 0 || fu.patient_id !== patientRow.rows[0].id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'doctor') {
      const doctorRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (doctorRow.rows.length === 0 || fu.doctor_id !== doctorRow.rows[0].id) {
        return res.status(403).json({ error: 'Access denied — not your follow-up' });
      }
    }

    if (fu.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot complete a cancelled follow-up' });
    }

    const result = await pool.query(
      `UPDATE follow_up_schedules SET status = 'completed' WHERE id = $1 RETURNING *`, [id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// PUT /api/follow-ups/:id/cancel — doctor or admin cancels
exports.cancelFollowUp = async (req, res) => {
  const { id } = req.params;

  try {
    const row = await pool.query('SELECT * FROM follow_up_schedules WHERE id = $1', [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Follow-up not found' });

    const fu = row.rows[0];

    if (req.user.role === 'doctor') {
      const doctorRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (doctorRow.rows.length === 0 || fu.doctor_id !== doctorRow.rows[0].id) {
        return res.status(403).json({ error: 'Access denied — not your follow-up' });
      }
    }

    if (['completed', 'cancelled'].includes(fu.status)) {
      return res.status(400).json({ error: `Cannot cancel a follow-up with status '${fu.status}'` });
    }

    const result = await pool.query(
      `UPDATE follow_up_schedules SET status = 'cancelled' WHERE id = $1 RETURNING *`, [id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// POST /api/follow-ups/process-reminders — admin: notify patients of upcoming follow-ups (next 3 days)
exports.processReminders = async (req, res) => {
  try {
    const upcoming = await pool.query(
      `SELECT fs.*, p.user_id AS patient_user_id
       FROM follow_up_schedules fs
       JOIN patients p ON p.id = fs.patient_id
       WHERE fs.status = 'pending'
         AND fs.reminder_sent = FALSE
         AND fs.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`
    );

    let created = 0;
    for (const fu of upcoming.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, is_read)
         VALUES ($1, $2, $3, FALSE)`,
        [
          fu.patient_user_id,
          'Follow-up Reminder',
          `You have a follow-up scheduled on ${fu.scheduled_date}. ${fu.notes || ''}`.trim(),
        ]
      );
      await pool.query(
        `UPDATE follow_up_schedules SET reminder_sent = TRUE WHERE id = $1`, [fu.id]
      );
      created++;
    }

    return res.json({ message: `Reminders sent`, count: created });
  } catch (err) {
    return handleDbError(err, res);
  }
};

// POST /api/follow-ups/process-missed — admin: mark overdue pending follow-ups as missed
exports.processMissed = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE follow_up_schedules
       SET status = 'missed'
       WHERE status = 'pending' AND scheduled_date < CURRENT_DATE
       RETURNING id`
    );
    return res.json({ message: 'Missed follow-ups updated', count: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (err) {
    return handleDbError(err, res);
  }
};
