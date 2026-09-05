// Shared doctor-availability validation for the unified appointments module.
// Used by every path that books an appointment — consultation, follow-up, or
// a scheduled triage escalation — so "considerate of the doctor's time slots"
// means the same thing everywhere instead of being enforced in one place and
// skipped in another.
const pool = require('../config/db');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDayOfWeek(dateString) {
  return DAY_NAMES[new Date(dateString).getDay()];
}

/**
 * Checks that (doctorId, date, startTime, endTime) doesn't overlap an existing
 * booked appointment for that doctor. Returns { ok: true } or { ok: false, error }.
 * This is the conflict-only half of availability — used on its own wherever a
 * doctor is allowed to book outside their declared slots but must still avoid
 * double-booking themselves.
 */
async function checkAppointmentConflict(doctorId, date, startTime, endTime, { excludeAppointmentId } = {}) {
  const params = [doctorId, date, startTime, endTime];
  let overlapQuery = `
    SELECT id FROM appointments
    WHERE doctor_id = $1 AND appointment_date = $2
      AND ($3 < appointment_end_time AND $4 > appointment_start_time)
      AND status IN ('pending', 'confirmed')`;
  if (excludeAppointmentId) {
    params.push(excludeAppointmentId);
    overlapQuery += ` AND id != $${params.length}`;
  }
  const overlapRes = await pool.query(overlapQuery, params);
  if (overlapRes.rows.length > 0) {
    return { ok: false, error: 'This overlaps an existing appointment for the doctor.' };
  }

  return { ok: true };
}

/**
 * Checks that (doctorId, date, startTime, endTime) falls inside one of the
 * doctor's declared time slots and doesn't overlap an existing booked
 * appointment. Returns { ok: true } or { ok: false, error }.
 */
async function validateDoctorAvailability(doctorId, date, startTime, endTime, { excludeAppointmentId } = {}) {
  const dayOfWeek = getDayOfWeek(date);

  const slotRes = await pool.query(
    `SELECT 1 FROM doctor_time_slots
     WHERE doctor_id = $1 AND day_of_week = $2
       AND start_time <= $3 AND end_time >= $4`,
    [doctorId, dayOfWeek, startTime, endTime]
  );
  if (slotRes.rows.length === 0) {
    return { ok: false, error: 'Doctor is not available at the selected time.' };
  }

  return checkAppointmentConflict(doctorId, date, startTime, endTime, { excludeAppointmentId });
}

module.exports = { getDayOfWeek, validateDoctorAvailability, checkAppointmentConflict };
