// Follow-ups are appointments with appointment_type = 'follow_up' — part of
// the unified appointments module, not a separate table. Every function here
// scopes its queries to that type so it only ever touches follow-up rows.
const pool = require('../../config/db');
const paginate = require('../../utils/pagination');
const handleDbError = require('../../utils/handleDbError');
const { validateDoctorAvailability, checkAppointmentConflict } = require('../../utils/appointmentAvailability');

// POST /api/follow-ups — doctor or admin creates a follow-up
exports.createFollowUp = async (req, res) => {
  const { patient_id, appointment_id, scheduled_date, appointment_start_time, appointment_end_time, notes } = req.body;
  const scheduledDate = scheduled_date || req.body.appointment_date;

  if (!patient_id || !scheduledDate) {
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

      // A doctor may only schedule a follow-up for a patient they've actually treated.
      const link = await pool.query(
        'SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1',
        [resolvedDoctorId, patient_id]
      );
      if (link.rows.length === 0) {
        return res.status(403).json({ error: 'Not your patient.' });
      }
    } else if (req.body.doctor_id) {
      resolvedDoctorId = req.body.doctor_id;
    }

    // Follow-ups may be date-only (a general check-in) or pinned to a specific
    // time. A doctor scheduling their own follow-up only needs to avoid double-
    // booking themselves (same policy as any doctor-initiated scheduling); an
    // admin assigning a doctor is held to that doctor's declared slots, since
    // the admin doesn't have the doctor's own knowledge of their real availability.
    if (resolvedDoctorId && appointment_start_time && appointment_end_time) {
      const availability = req.user.role === 'doctor'
        ? await checkAppointmentConflict(resolvedDoctorId, scheduledDate, appointment_start_time, appointment_end_time)
        : await validateDoctorAvailability(resolvedDoctorId, scheduledDate, appointment_start_time, appointment_end_time);
      if (!availability.ok) {
        return res.status(400).json({ error: availability.error });
      }
    }

    const result = await pool.query(
      `INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time,
          notes, status, reminder_sent, appointment_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', FALSE, 'follow_up', $7)
       RETURNING *, appointment_date AS scheduled_date`,
      [patient_id, resolvedDoctorId, scheduledDate, appointment_start_time || null, appointment_end_time || null, notes || null, req.user.id]
    );

    const followUp = result.rows[0];

    // Notification logic
    if (!resolvedDoctorId) {
      // No doctor assigned — notify all admins
      const admins = await pool.query(
        'SELECT id FROM users WHERE role = $1',
        ['admin']
      );
      for (const admin of admins.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, is_read, category)
           VALUES ($1, $2, $3, FALSE, 'followup')`,
          [
            admin.id,
            'Follow-Up Needs Assignment',
            `A new follow-up for patient ID ${patient_id} scheduled on ${scheduledDate} needs a doctor assigned.`
          ]
        );
      }
    } else {
      // Doctor assigned — notify the doctor
      const doctorUser = await pool.query(
        'SELECT user_id FROM doctors WHERE id = $1',
        [resolvedDoctorId]
      );
      if (doctorUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, is_read, category)
           VALUES ($1, $2, $3, FALSE, 'followup')`,
          [
            doctorUser.rows[0].user_id,
            'New Follow-Up Assigned',
            `You have been assigned a follow-up for patient ID ${patient_id} scheduled on ${scheduledDate}.`
          ]
        );
      }
    }

    return res.status(201).json(followUp);
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
    const sort  = req.query.sort || '-appointment_date';

    const result = await paginate({
      table: 'appointments fs',
      page, limit, sort,
      sortTable: 'fs',
      select: `
        fs.*, fs.appointment_date AS scheduled_date, du.full_name AS doctor_name
      `,
      join: `
        LEFT JOIN doctors d ON fs.doctor_id = d.id
        LEFT JOIN users du ON d.user_id = du.id
      `,
      filters: {
        'fs.patient_id': patientId,
        'fs.appointment_type': 'follow_up',
        ...(req.query.status ? { 'fs.status': req.query.status } : {}),
      },
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
    const sort  = req.query.sort || '-appointment_date';

    const result = await paginate({
      table: 'appointments fs',
      page, limit, sort,
      sortTable: 'fs',
      select: `
        fs.*, fs.appointment_date AS scheduled_date, pu.full_name AS patient_name
      `,
      join: `
        JOIN patients p ON fs.patient_id = p.id
        JOIN users pu ON p.user_id = pu.id
      `,
      filters: {
        'fs.doctor_id': doctorId,
        'fs.appointment_type': 'follow_up',
        ...(req.query.status ? { 'fs.status': req.query.status } : {}),
      },
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
    const sort  = req.query.sort || '-appointment_date';

    const validFilters = ['patient_id', 'doctor_id', 'status', 'reminder_sent'];
    // patient_id/doctor_id must be coerced to numbers before reaching paginate():
    // query-string values are always strings, and paginate() routes any string
    // that doesn't parse as a date through `LOWER(column) LIKE ...`, which
    // fails with "function lower(integer) does not exist" against an int column.
    const NUMERIC_FILTERS = new Set(['patient_id', 'doctor_id']);
    const filters = { 'fs.appointment_type': 'follow_up' };
    for (const key of validFilters) {
      const raw = req.query[key];
      if (raw === undefined || raw === '') continue;
      if (NUMERIC_FILTERS.has(key)) {
        const n = Number(raw);
        if (!Number.isInteger(n)) return res.status(400).json({ error: `Invalid ${key}` });
        filters[`fs.${key}`] = n;
      } else {
        filters[`fs.${key}`] = raw;
      }
    }

    const result = await paginate({
      table: 'appointments fs',
      page, limit, sort,
      sortTable: 'fs',
      select: `
        fs.*, fs.appointment_date AS scheduled_date, pu.full_name AS patient_name, du.full_name AS doctor_name
      `,
      join: `
        JOIN patients p ON fs.patient_id = p.id
        JOIN users pu ON p.user_id = pu.id
        LEFT JOIN doctors d ON fs.doctor_id = d.id
        LEFT JOIN users du ON d.user_id = du.id
      `,
      filters,
    });
    return res.json(result);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Fetch a follow-up (appointment_type = 'follow_up') by id, or null.
async function getFollowUpById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM appointments WHERE id = $1 AND appointment_type = 'follow_up'`,
    [id]
  );
  return rows[0] || null;
}

// PUT /api/follow-ups/:id/complete — patient or doctor marks complete
exports.completeFollowUp = async (req, res) => {
  const { id } = req.params;
  const { outcome_notes } = req.body || {};

  try {
    const fu = await getFollowUpById(id);
    if (!fu) return res.status(404).json({ error: 'Follow-up not found' });

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

    // outcome_notes is a clinical field — only a doctor's value is ever
    // honored, even if a patient's own completion request happens to
    // include one (the patient-facing UI never sends this field, but the
    // API itself shouldn't trust the client's role claim over req.user).
    if (outcome_notes !== undefined && req.user.role === 'doctor') {
      if (typeof outcome_notes !== 'string' || outcome_notes.length > 5000) {
        return res.status(400).json({ error: 'Outcome notes must be text under 5000 characters.' });
      }
    }
    const notesToStore = req.user.role === 'doctor' ? (outcome_notes || null) : null;

    const result = await pool.query(
      `UPDATE appointments
       SET status = 'completed',
           outcome_notes = COALESCE($2, outcome_notes),
           completed_at = COALESCE(completed_at, NOW())
       WHERE id = $1 RETURNING *, appointment_date AS scheduled_date`,
      [id, notesToStore]
    );

    // Notify the other party
    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [fu.patient_id]);

    if (req.user.role === 'doctor' && patientUser.rows.length > 0) {
      // Doctor completed it — notify patient
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, is_read, category)
         VALUES ($1, $2, $3, FALSE, 'followup')`,
        [
          patientUser.rows[0].user_id,
          'Follow-Up Completed',
          `Your follow-up scheduled for ${fu.appointment_date} has been marked as completed by your doctor.`
        ]
      );
    } else if (req.user.role === 'patient' && fu.doctor_id) {
      // Patient completed it — notify doctor
      const doctorUser = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [fu.doctor_id]);
      if (doctorUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, is_read, category)
           VALUES ($1, $2, $3, FALSE, 'followup')`,
          [
            doctorUser.rows[0].user_id,
            'Follow-Up Completed',
            `Patient ID ${fu.patient_id} has marked their follow-up scheduled for ${fu.appointment_date} as completed.`
          ]
        );
      }
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// PUT /api/follow-ups/:id/cancel — doctor or admin cancels
exports.cancelFollowUp = async (req, res) => {
  const { id } = req.params;

  try {
    const fu = await getFollowUpById(id);
    if (!fu) return res.status(404).json({ error: 'Follow-up not found' });

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
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1 RETURNING *, appointment_date AS scheduled_date`, [id]
    );

    // Notify patient
    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [fu.patient_id]);
    if (patientUser.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, is_read, category)
         VALUES ($1, $2, $3, FALSE, 'followup')`,
        [
          patientUser.rows[0].user_id,
          'Follow-Up Cancelled',
          `Your follow-up scheduled for ${fu.appointment_date} has been cancelled.`
        ]
      );
    }

    // Notify doctor if they didn't cancel it themselves
    if (req.user.role !== 'doctor' && fu.doctor_id) {
      const doctorUser = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [fu.doctor_id]);
      if (doctorUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, is_read, category)
           VALUES ($1, $2, $3, FALSE, 'followup')`,
          [
            doctorUser.rows[0].user_id,
            'Follow-Up Cancelled',
            `A follow-up for patient ID ${fu.patient_id} scheduled for ${fu.appointment_date} has been cancelled.`
          ]
        );
      }
    }

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
       FROM appointments fs
       JOIN patients p ON p.id = fs.patient_id
       WHERE fs.appointment_type = 'follow_up'
         AND fs.status = 'pending'
         AND fs.reminder_sent = FALSE
         AND fs.appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`
    );

    let created = 0;
    for (const fu of upcoming.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, is_read, category)
         VALUES ($1, $2, $3, FALSE, 'followup')`,
        [
          fu.patient_user_id,
          'Follow-up Reminder',
          `You have a follow-up scheduled on ${fu.appointment_date}. ${fu.notes || ''}`.trim(),
        ]
      );
      await pool.query(
        `UPDATE appointments SET reminder_sent = TRUE WHERE id = $1`, [fu.id]
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
      `UPDATE appointments
       SET status = 'missed'
       WHERE appointment_type = 'follow_up' AND status = 'pending' AND appointment_date < CURRENT_DATE
       RETURNING id, patient_id, doctor_id, appointment_date`
    );

    // Notify patients, doctors, and admins for each missed follow-up
    for (const fu of result.rows) {
      // Notify patient
      const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [fu.patient_id]);
      if (patientUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, is_read, category)
           VALUES ($1, $2, $3, FALSE, 'followup')`,
          [
            patientUser.rows[0].user_id,
            'Missed Follow-Up',
            `You missed your follow-up scheduled for ${fu.appointment_date}. Please contact your doctor to reschedule.`
          ]
        );
      }

      // Notify doctor if assigned
      if (fu.doctor_id) {
        const doctorUser = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [fu.doctor_id]);
        if (doctorUser.rows.length > 0) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, body, is_read, category)
             VALUES ($1, $2, $3, FALSE, 'followup')`,
            [
              doctorUser.rows[0].user_id,
              'Patient Missed Follow-Up',
              `Patient ID ${fu.patient_id} missed their follow-up scheduled for ${fu.appointment_date}.`
            ]
          );
        }
      }

      // Notify all admins
      const admins = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
      for (const admin of admins.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, is_read, category)
           VALUES ($1, $2, $3, FALSE, 'followup')`,
          [
            admin.id,
            'Follow-Up Missed',
            `Patient ID ${fu.patient_id} missed their follow-up scheduled for ${fu.appointment_date}.`
          ]
        );
      }
    }

    return res.json({ message: 'Missed follow-ups updated', count: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (err) {
    return handleDbError(err, res);
  }
};

// PUT /api/follow-ups/:id/assign — admin assigns (or reassigns) a doctor to a follow-up
exports.assignFollowUp = async (req, res) => {
  const { id } = req.params;
  const { doctor_id, appointment_start_time, appointment_end_time } = req.body;

  if (!doctor_id) {
    return res.status(400).json({ error: 'doctor_id is required' });
  }

  try {
    const fu = await getFollowUpById(id);
    if (!fu) return res.status(404).json({ error: 'Follow-up not found' });

    if (['completed', 'cancelled'].includes(fu.status)) {
      return res.status(400).json({ error: `Cannot assign a doctor to a follow-up with status '${fu.status}'` });
    }

    // Verify doctor exists
    const doctorCheck = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [doctor_id]);
    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // A specific time may be supplied alongside the assignment (or the
    // follow-up may already have one from creation) — either way, the newly
    // assigned doctor's availability must be respected.
    const startTime = appointment_start_time || fu.appointment_start_time;
    const endTime = appointment_end_time || fu.appointment_end_time;
    if (startTime && endTime) {
      const availability = await validateDoctorAvailability(doctor_id, fu.appointment_date, startTime, endTime, { excludeAppointmentId: fu.id });
      if (!availability.ok) {
        // needsReschedule tells the admin UI to offer the doctor's actual
        // available slots instead of just showing the error — the same
        // convention the appointment-reassign flow already uses.
        return res.status(400).json({ error: availability.error, needsReschedule: true });
      }
    }

    const wasReassignment = !!fu.doctor_id && fu.doctor_id !== doctor_id;
    const previousDoctorId = fu.doctor_id;

    const result = await pool.query(
      `UPDATE appointments SET doctor_id = $1, appointment_start_time = COALESCE($2, appointment_start_time), appointment_end_time = COALESCE($3, appointment_end_time) WHERE id = $4 RETURNING *, appointment_date AS scheduled_date`,
      [doctor_id, appointment_start_time || null, appointment_end_time || null, id]
    );

    // If this took the follow-up away from a previously assigned doctor, let them know.
    if (wasReassignment) {
      const prevDoctorUser = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [previousDoctorId]);
      if (prevDoctorUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, is_read, category)
           VALUES ($1, $2, $3, FALSE, 'followup')`,
          [
            prevDoctorUser.rows[0].user_id,
            'Follow-Up Reassigned',
            `A follow-up for patient ID ${fu.patient_id} scheduled on ${fu.appointment_date} has been reassigned to another doctor.`
          ]
        );
      }
    }

    // Notify the assigned doctor
    await pool.query(
      `INSERT INTO notifications (user_id, title, body, is_read, category)
       VALUES ($1, $2, $3, FALSE, 'followup')`,
      [
        doctorCheck.rows[0].user_id,
        wasReassignment ? 'Follow-Up Reassigned to You' : 'New Follow-Up Assigned',
        `You have been assigned a follow-up for patient ID ${fu.patient_id} scheduled on ${fu.appointment_date}.`
      ]
    );

    // Notify the patient
    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [fu.patient_id]);
    if (patientUser.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, is_read, category)
         VALUES ($1, $2, $3, FALSE, 'followup')`,
        [
          patientUser.rows[0].user_id,
          'Doctor Assigned to Follow-Up',
          `A doctor has been assigned to your follow-up scheduled for ${fu.appointment_date}.`
        ]
      );
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// PUT /api/follow-ups/:id/reschedule — admin or doctor reschedules a follow-up
exports.rescheduleFollowUp = async (req, res) => {
  const { id } = req.params;
  const { scheduled_date, appointment_start_time, appointment_end_time } = req.body;
  const newDate = scheduled_date || req.body.appointment_date;

  if (!newDate) {
    return res.status(400).json({ error: 'scheduled_date is required' });
  }

  try {
    const fu = await getFollowUpById(id);
    if (!fu) return res.status(404).json({ error: 'Follow-up not found' });

    // Doctor can only reschedule their own follow-ups
    if (req.user.role === 'doctor') {
      const doctorRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (doctorRow.rows.length === 0 || fu.doctor_id !== doctorRow.rows[0].id) {
        return res.status(403).json({ error: 'Access denied — not your follow-up' });
      }
    }

    if (['completed', 'cancelled'].includes(fu.status)) {
      return res.status(400).json({ error: `Cannot reschedule a follow-up with status '${fu.status}'` });
    }

    const newStartTime = appointment_start_time || fu.appointment_start_time;
    const newEndTime = appointment_end_time || fu.appointment_end_time;

    // If there's an assigned doctor and we have a concrete time, the new
    // slot must still respect that doctor's availability.
    if (fu.doctor_id && newStartTime && newEndTime) {
      const availability = await validateDoctorAvailability(fu.doctor_id, newDate, newStartTime, newEndTime, { excludeAppointmentId: fu.id });
      if (!availability.ok) {
        return res.status(400).json({ error: availability.error });
      }
    }

    // A rescheduled "missed" follow-up now has a fresh future date — it's actionable again.
    const newStatus = fu.status === 'missed' ? 'pending' : fu.status;

    const result = await pool.query(
      `UPDATE appointments
       SET appointment_date = $1, appointment_start_time = $2, appointment_end_time = $3, status = $4, reminder_sent = FALSE
       WHERE id = $5 RETURNING *, appointment_date AS scheduled_date`,
      [newDate, newStartTime || null, newEndTime || null, newStatus, id]
    );

    // Notify patient
    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [fu.patient_id]);
    if (patientUser.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, is_read, category)
         VALUES ($1, $2, $3, FALSE, 'followup')`,
        [
          patientUser.rows[0].user_id,
          'Follow-Up Rescheduled',
          `Your follow-up has been rescheduled from ${fu.appointment_date} to ${newDate}.`
        ]
      );
    }

    // Notify doctor if admin rescheduled it
    if (req.user.role === 'admin' && fu.doctor_id) {
      const doctorUser = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [fu.doctor_id]);
      if (doctorUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, is_read, category)
           VALUES ($1, $2, $3, FALSE, 'followup')`,
          [
            doctorUser.rows[0].user_id,
            'Follow-Up Rescheduled',
            `A follow-up for patient ID ${fu.patient_id} has been rescheduled from ${fu.appointment_date} to ${newDate}.`
          ]
        );
      }
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};
