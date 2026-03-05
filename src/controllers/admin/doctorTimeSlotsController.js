const pool = require('../../config/db');
const paginate = require('../../utils/pagination');

// GET /api/admin/doctor-slots
//  • ?list_only=true → list of doctors (id + full_name)
//  • ?doctor_id=XX  → just that doctor’s slots
//  • otherwise      → all slots with doctor_name
exports.getAllDoctorTimeSlots = async (req, res) => {
  try {
    const { list_only, doctor_id } = req.query;

    // -------- 1) Just list doctors (id + name) --------
    if (String(list_only) === '1' || String(list_only).toLowerCase() === 'true') {
      const result = await paginate({
        table: 'doctors d',
        sortTable: 'u', // we want to sort by users.full_name
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        sort: req.query.sort || '+full_name', // sorted by name
        select: 'd.id, u.full_name AS doctor_name',
        join: 'JOIN users u ON d.user_id = u.id',
        // optional fuzzy search by name: ?q=ali
        filters: {
          'u.full_name': req.query.q || undefined
        }
      });
      return res.json(result);
    }

    // Optional day filter in either param name
    const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const dayParam = req.query.day_of_week || req.query.day;
    const dayFilter = dayParam && DAYS.includes(dayParam) ? dayParam : undefined;

    // -------- 2) One doctor's slots --------
    if (doctor_id) {
      const result = await paginate({
        table: 'doctor_time_slots dts',
        sortTable: 'dts',
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        // original code had ORDER BY day_of_week, start_time (alpha day order);
        // paginator supports single-column sort; default to start_time
        sort: req.query.sort || '+start_time',
        select: 'dts.id, dts.doctor_id, dts.day_of_week, dts.start_time, dts.end_time',
        join: '',
        filters: {
          'dts.doctor_id': parseInt(doctor_id, 10) || -1,
          'dts.day_of_week': dayFilter || undefined
        }
      });
      return res.json(result);
    }

    // -------- 3) All slots (with doctor names) --------
    const result = await paginate({
      table: 'doctor_time_slots dts',
      // we’ll default to grouping by doctor name, so use users (u) for sorting
      sortTable: 'u',
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      // original had: ORDER BY u.full_name, CASE(day_of_week), start_time
      // here we approximate with doctor name; add ?sort=+start_time if you prefer time-first
      sort: req.query.sort || '+full_name',
      select: `
        dts.id, dts.doctor_id, dts.day_of_week, dts.start_time, dts.end_time,
        u.full_name AS doctor_name
      `,
      join: `
        JOIN doctors d ON dts.doctor_id = d.id
        JOIN users   u ON d.user_id     = u.id
      `,
      // optional filters:
      filters: {
        'u.full_name': req.query.q || undefined,          // search by doctor name
        'dts.day_of_week': dayFilter || undefined         // filter by day across all doctors
      }
    });

    return res.json(result);
  } catch (err) {
    console.error('[getAllDoctorTimeSlots] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/doctor-slots
exports.createDoctorTimeSlots = async (req, res) => {
  const { doctor_id, day_of_week, start_time, end_time } = req.body;
  if (!doctor_id || !day_of_week || !start_time || !end_time) {
    return res
      .status(400)
      .json({ error: 'doctor_id, day_of_week, start_time and end_time are required.' });
  }
  try {
    const inserted = await pool.query(
      `INSERT INTO doctor_time_slots
         (doctor_id, day_of_week, start_time, end_time)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [doctor_id, day_of_week, start_time, end_time]
    );
    res.status(201).json(inserted.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/doctor-slots/:id
exports.updateDoctorTimeSlots = async (req, res) => {
  const { id } = req.params;
  const { doctor_id, day_of_week, start_time, end_time } = req.body;
  if (!doctor_id || !day_of_week || !start_time || !end_time) {
    return res
      .status(400)
      .json({ error: 'doctor_id, day_of_week, start_time and end_time are required.' });
  }
  try {
    const updated = await pool.query(
      `UPDATE doctor_time_slots
          SET doctor_id   = $1,
              day_of_week = $2,
              start_time  = $3,
              end_time    = $4
        WHERE id = $5
      RETURNING *`,
      [doctor_id, day_of_week, start_time, end_time, id]
    );
    if (!updated.rows.length) {
      return res.status(404).json({ error: 'Time slot not found.' });
    }
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/doctor-slots/:id
exports.deleteDoctorTimeSlots = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await pool.query(
      `DELETE FROM doctor_time_slots
        WHERE id = $1
      RETURNING *`,
      [id]
    );
    if (!deleted.rows.length) {
      return res.status(404).json({ error: 'Time slot not found.' });
    }
    res.json({ message: 'Deleted.', slot: deleted.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
