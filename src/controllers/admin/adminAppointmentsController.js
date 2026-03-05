const pool = require('../../config/db');
const paginate = require('../../utils/pagination');

exports.getAllAppointments = async (req, res) => {
  try {
    const { doctor, patient, date, status } = req.query;

    const result = await paginate({
      table: 'appointments',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '+id',
      sortTable: 'a',
      join: `
        AS a JOIN doctors d ON a.doctor_id = d.id
        JOIN users duser ON d.user_id = duser.id
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
        "a.status": status
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
      console.error('Delete Appointment Error:', err.message);
      res.status(500).json({ error: 'Failed to delete appointment.', details: err.message });
    }
  };

exports.reassignAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_id } = req.body;
    await pool.query('UPDATE appointments SET doctor_id = $1 WHERE id = $2', [doctor_id, id]);
    res.json({ message: 'Appointment reassigned successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reassign appointment.' });
  }
};
