const pool = require('../../config/db');
const paginate = require('../../utils/pagination');

// GET /api/doctor/slots?page=1&limit=10&sort=+start_time&day=Monday
exports.getDoctorTimeSlots = async (req, res) => {
  try {
    // ensure this user is a doctor
    const { rows: dr } = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [req.user.id]
    );
    if (!dr.length) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }
    const doctorId = dr[0].id;

    // optional filter by day
    const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const day = req.query.day_of_week || req.query.day;
    const dayFilter = day && DAYS.includes(day) ? day : undefined;

    // use your paginate() helper
    const result = await paginate({
      table: 'doctor_time_slots dts',
      sortTable: 'dts',
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      // NOTE: paginator validates columns; allowed: id, doctor_id, day_of_week, start_time, end_time
      sort: req.query.sort || '+start_time',
      select: 'dts.id, dts.doctor_id, dts.day_of_week, dts.start_time, dts.end_time',
      join: '',
      filters: {
        'dts.doctor_id': doctorId,
        'dts.day_of_week': dayFilter || undefined
      }
    });

    // paginator returns: { currentPage, totalPages, pageSize, totalItems, data }
    res.json(result);
  } catch (err) {
    console.error('[getDoctorTimeSlots] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createDoctorTimeSlot = async (req, res) => {
  const { day_of_week, start_time, end_time } = req.body;
  if (!day_of_week || !start_time || !end_time) {
    return res
      .status(400)
      .json({ error: 'day_of_week, start_time and end_time are required.' });
  }

  try {
    const doctorRow = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [req.user.id]
    );
    if (!doctorRow.rows.length) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }
    const doctorId = doctorRow.rows[0].id;

    const inserted = await pool.query(
      `INSERT INTO doctor_time_slots
         (doctor_id, day_of_week, start_time, end_time)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [doctorId, day_of_week, start_time, end_time]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDoctorTimeSlot = async (req, res) => {
  const { id } = req.params;
  const { day_of_week, start_time, end_time } = req.body;
  if (!day_of_week || !start_time || !end_time) {
    return res
      .status(400)
      .json({ error: 'day_of_week, start_time and end_time are required.' });
  }

  try {
    const doctorRow = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [req.user.id]
    );
    if (!doctorRow.rows.length) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }
    const doctorId = doctorRow.rows[0].id;

    // ensure the slot belongs to this doctor
    const slotCheck = await pool.query(
      'SELECT 1 FROM doctor_time_slots WHERE id = $1 AND doctor_id = $2',
      [id, doctorId]
    );
    if (!slotCheck.rows.length) {
      return res.status(404).json({ error: 'Time slot not found.' });
    }

    const updated = await pool.query(
      `UPDATE doctor_time_slots
          SET day_of_week = $1,
              start_time  = $2,
              end_time    = $3
        WHERE id = $4
      RETURNING *`,
      [day_of_week, start_time, end_time, id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDoctorTimeSlot = async (req, res) => {
  const { id } = req.params;
  try {
    const doctorRow = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [req.user.id]
    );
    if (!doctorRow.rows.length) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }
    const doctorId = doctorRow.rows[0].id;

    const deleted = await pool.query(
      `DELETE FROM doctor_time_slots
        WHERE id = $1 AND doctor_id = $2
      RETURNING *`,
      [id, doctorId]
    );

    if (!deleted.rows.length) {
      return res.status(404).json({ error: 'Time slot not found.' });
    }

    res.json({ message: 'Deleted.', slot: deleted.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
