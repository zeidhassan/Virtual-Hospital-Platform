const pool = require('../../config/db');
const paginate = require('../../utils/pagination');
const { validateDoctorAvailability } = require('../../utils/appointmentAvailability');

exports.getAllAppointments = async (req, res) => {
  try {
    const { doctor, patient, date, status, appointment_type } = req.query;

    const result = await paginate({
      table: 'appointments',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '+id',
      sortTable: 'a',
      join: `
        AS a LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN users duser ON d.user_id = duser.id
        JOIN patients p ON a.patient_id = p.id
        JOIN users puser ON p.user_id = puser.id
      `,
      select: `
        a.*, duser.full_name AS doctor_name, puser.full_name AS patient_name
      `,
      filters: {
        "duser.full_name": doctor,
        "puser.full_name": patient,
        "a.appointment_date": date,
        "a.status": status,
        "a.appointment_type": appointment_type
      }
    });

    res.json(result);
  } catch (err) {
    console.error('[getAllAppointments]', err.message);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
};

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

exports.deleteAppointment = async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete appointments.' });
    }
  
    try {
      const appointmentId = req.params.id;
  
      // Check for prescriptions linked to this appointment
      const prescriptionCheck = await pool.query(
        'SELECT id FROM prescriptions WHERE appointment_id = $1',
        [appointmentId]
      );
  
      if (prescriptionCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'This appointment has an active prescription and cannot be deleted.'
        });
      }
  
      // Delete only if no prescription exists
      const result = await pool.query(
        'DELETE FROM appointments WHERE id = $1 RETURNING *',
        [appointmentId]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Appointment not found.' });
      }
  
      res.json({ message: 'Appointment deleted successfully.' });
    } catch (err) {
      console.error('Delete Appointment Error:', err);
      res.status(500).json({ error: 'Failed to delete appointment.' });
    }
  };

// Reassigns (or, for an unassigned follow-up, assigns) any appointment type to a
// doctor. If the appointment already has a specific time, the new doctor's
// availability is validated the same way as any other booking. When the new
// doctor isn't free at the existing time, the response sets needsReschedule so
// the admin UI can prompt for a new date/time and retry with those included —
// the caller may pass appointment_date/appointment_start_time/appointment_end_time
// up front to reassign and reschedule in one step.
exports.reassignAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_id, appointment_date, appointment_start_time, appointment_end_time } = req.body;

    if (!doctor_id) {
      return res.status(400).json({ error: 'doctor_id is required.' });
    }

    const apptResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    const appt = apptResult.rows[0];

    if (['completed', 'cancelled'].includes(appt.status)) {
      return res.status(400).json({ error: `Cannot reassign an appointment with status '${appt.status}'.` });
    }

    const doctorCheck = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [doctor_id]);
    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const newDate = appointment_date || appt.appointment_date;
    const newStart = appointment_start_time || appt.appointment_start_time;
    const newEnd = appointment_end_time || appt.appointment_end_time;

    if (newStart && newEnd) {
      const availability = await validateDoctorAvailability(doctor_id, newDate, newStart, newEnd, { excludeAppointmentId: appt.id });
      if (!availability.ok) {
        return res.status(400).json({ error: availability.error, needsReschedule: true });
      }
    }

    const previousDoctorId = appt.doctor_id;
    const wasReassignment = !!previousDoctorId && previousDoctorId !== parseInt(doctor_id);

    const result = await pool.query(
      `UPDATE appointments
       SET doctor_id = $1, appointment_date = $2, appointment_start_time = $3, appointment_end_time = $4,
           reminder_sent = CASE WHEN $2 IS DISTINCT FROM appointment_date THEN FALSE ELSE reminder_sent END
       WHERE id = $5 RETURNING *`,
      [doctor_id, newDate, newStart || null, newEnd || null, id]
    );

    const finalDate = result.rows[0].appointment_date;
    const wasRescheduled = newDate !== appt.appointment_date || newStart !== appt.appointment_start_time;

    if (wasReassignment) {
      const prevDoctorUser = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [previousDoctorId]);
      if (prevDoctorUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'appointment')`,
          [prevDoctorUser.rows[0].user_id, 'Appointment Reassigned', `An appointment for patient ID ${appt.patient_id} scheduled on ${appt.appointment_date} has been reassigned to another doctor.`]
        );
      }
    }

    await pool.query(
      `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'appointment')`,
      [doctorCheck.rows[0].user_id, previousDoctorId ? 'Appointment Reassigned to You' : 'New Appointment Assigned', `You have been assigned an appointment for patient ID ${appt.patient_id} scheduled on ${finalDate}${wasRescheduled ? ' (rescheduled)' : ''}.`]
    );

    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [appt.patient_id]);
    if (patientUser.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'appointment')`,
        [patientUser.rows[0].user_id, 'Doctor Assigned', `A doctor has been assigned to your appointment${wasRescheduled ? `, now rescheduled to ${finalDate}` : ` scheduled for ${finalDate}`}.`]
      );
    }

    res.json({ message: 'Appointment reassigned successfully.', appointment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reassign appointment.' });
  }
};

// Updates status and/or reschedules any appointment type. A reschedule that changes
// the date/time is validated against the assigned doctor's slots (when one exists)
// and clears reminder_sent so the reminder cycle restarts for the new date.
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, appointment_date, appointment_start_time, appointment_end_time } = req.body;

    const existingResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    const existing = existingResult.rows[0];

    const isReschedule = !!(appointment_date || appointment_start_time || appointment_end_time);
    const newDate = appointment_date || existing.appointment_date;
    const newStart = appointment_start_time || existing.appointment_start_time;
    const newEnd = appointment_end_time || existing.appointment_end_time;

    if (isReschedule && existing.doctor_id && newStart && newEnd) {
      const availability = await validateDoctorAvailability(existing.doctor_id, newDate, newStart, newEnd, { excludeAppointmentId: existing.id });
      if (!availability.ok) {
        return res.status(400).json({ error: availability.error });
      }
    }

    const updates = [];
    const values = [];

    if (status) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    if (appointment_date) {
      values.push(appointment_date);
      updates.push(`appointment_date = $${values.length}`);
    }
    if (appointment_start_time) {
      values.push(appointment_start_time);
      updates.push(`appointment_start_time = $${values.length}`);
    }
    if (appointment_end_time) {
      values.push(appointment_end_time);
      updates.push(`appointment_end_time = $${values.length}`);
    }
    if (isReschedule) {
      updates.push('reminder_sent = FALSE');
      if (!status && existing.status === 'missed') {
        values.push('pending');
        updates.push(`status = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [existing.patient_id]);
    if (patientUser.rows.length > 0) {
      const title = isReschedule ? 'Appointment Rescheduled' : 'Appointment Updated';
      const body = isReschedule
        ? `Your appointment has been rescheduled to ${result.rows[0].appointment_date}.`
        : `Your appointment status has been updated to ${status}.`;
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'appointment')`,
        [patientUser.rows[0].user_id, title, body]
      );
    }

    res.json({ message: 'Appointment updated successfully.', appointment: result.rows[0] });
  } catch (err) {
    console.error('[updateAppointment]', err.message);
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
};

// Sends a one-off reminder notification for a single appointment, regardless of
// type — unlike the bulk follow-up reminder sweep, this targets exactly the
// appointment the admin picked.
exports.sendAppointmentReminder = async (req, res) => {
  try {
    const { id } = req.params;

    const apptResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    const appt = apptResult.rows[0];

    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [appt.patient_id]);
    if (patientUser.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const timeStr = appt.appointment_start_time ? ` at ${appt.appointment_start_time.slice(0, 5)}` : '';
    await pool.query(
      `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'appointment')`,
      [
        patientUser.rows[0].user_id,
        'Appointment Reminder',
        `Reminder: you have an appointment on ${appt.appointment_date}${timeStr}.${appt.notes ? ` Notes: ${appt.notes}` : ''}`,
      ]
    );

    await pool.query('UPDATE appointments SET reminder_sent = TRUE WHERE id = $1', [id]);

    res.json({ message: 'Reminder sent.' });
  } catch (err) {
    console.error('[sendAppointmentReminder]', err.message);
    res.status(500).json({ error: 'Failed to send reminder.' });
  }
};

// Admin creates any appointment for any patient/doctor pair — used for general
// scheduling and, when triage_session_id is given, to schedule a consult from an
// escalated triage case (also marks that session as escalated to the doctor).
exports.createAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, notes, appointment_type, triage_session_id } = req.body;

    if (!patient_id || !appointment_date) {
      return res.status(400).json({ error: 'patient_id and appointment_date are required.' });
    }

    const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1', [patient_id]);
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    if (doctor_id && appointment_start_time && appointment_end_time) {
      const availability = await validateDoctorAvailability(doctor_id, appointment_date, appointment_start_time, appointment_end_time);
      if (!availability.ok) {
        return res.status(400).json({ error: availability.error });
      }
    }

    const resolvedType = appointment_type || (triage_session_id ? 'triage_escalation' : 'consultation');

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, status, notes, appointment_type, triage_session_id, created_by)
       VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, $7, $8, $9) RETURNING *`,
      [patient_id, doctor_id || null, appointment_date, appointment_start_time || null, appointment_end_time || null, notes || null, resolvedType, triage_session_id || null, req.user.id]
    );

    if (triage_session_id && doctor_id) {
      await pool.query('UPDATE triage_sessions SET escalated_to_doctor_id = $1 WHERE id = $2', [doctor_id, triage_session_id]);
    }

    if (doctor_id) {
      const doctorUser = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [doctor_id]);
      if (doctorUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'appointment')`,
          [doctorUser.rows[0].user_id, 'New Appointment Scheduled', `An appointment for patient ID ${patient_id} has been scheduled for you on ${appointment_date}.`]
        );
      }
    }

    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [patient_id]);
    if (patientUser.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'appointment')`,
        [patientUser.rows[0].user_id, 'Appointment Scheduled', `An appointment has been scheduled for you on ${appointment_date}.`]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[createAppointment]', err.message);
    res.status(500).json({ error: 'Failed to create appointment.' });
  }
};
