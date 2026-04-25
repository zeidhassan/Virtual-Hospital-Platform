const db = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all time slots
exports.getAllDoctorTimeSlots = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "doctor_id",
      "day_of_week",
      "start_time",
      "end_time"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'doctor_time_slots',
      page,
      limit,
      sort
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

// Get time slot by ID
exports.getDoctorTimeSlotsById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM doctor_time_slots WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Time slot not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Search doctor time slots by name (admin only)
exports.searchDoctorTimeSlots = async (req, res) => {
  try {
    const { name, day, time } = req.query;
    const conditions = [];
    const values = [];

    // Doctor name filter (joins to users)
    if (name) {
      values.push(`%${name.toLowerCase()}%`);
      conditions.push(`LOWER(u.full_name) LIKE $${values.length}`);
    }

    // Date filter
    if (day) {
      values.push(day);
      conditions.push(`LOWER(ts.day_of_week) = LOWER($${values.length})`);
    }

    // Time filter (within time range)
    if (time) {
      values.push(time);
      values.push(time);
      conditions.push(`ts.start_time <= $${values.length - 1} AND ts.end_time >= $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(`
      SELECT ts.*
      FROM doctor_time_slots ts
      JOIN doctors d ON ts.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      ${whereClause}
      ORDER BY ts.id
    `, values);

    res.json(result.rows);
  } catch (err) {
    console.error('[searchDoctorTimeSlots] Error:', err.message);
    return handleDbError(err, res);
  }
};

// Create a new time slot
exports.createDoctorTimeSlots = async (req, res) => {
  const { doctor_id, day_of_week, start_time, end_time } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO doctor_time_slots (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [doctor_id, day_of_week, start_time, end_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Update a time slot
exports.updateDoctorTimeSlots = async (req, res) => {
  const { id } = req.params;
  const { doctor_id, day_of_week, start_time, end_time } = req.body;
  try {
    const result = await db.query(
      'UPDATE doctor_time_slots SET doctor_id=$1, day_of_week=$2, start_time=$3, end_time=$4 WHERE id=$5 RETURNING *',
      [doctor_id, day_of_week, start_time, end_time, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Time slot not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Delete a time slot
exports.deleteDoctorTimeSlots = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM doctor_time_slots WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Time slot not found' });
    res.json({ message: 'Time slot deleted', slot: result.rows[0] });
  } catch (err) {
    return handleDbError(err, res);
  }
};