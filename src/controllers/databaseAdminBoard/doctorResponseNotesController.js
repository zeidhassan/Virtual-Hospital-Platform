const db = require('../../config/db');
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all notes
exports.getAllDoctorResponseNotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "doctor_id",
      "response_id",
      "note",
      "created_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'doctor_response_notes',
      page,
      limit,
      sort,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

// Get note by ID
exports.getDoctorResponseNotesById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM doctor_response_notes WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new note
exports.createDoctorResponseNotes = async (req, res) => {
  const { doctor_id, response_id, note } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO doctor_response_notes (doctor_id, response_id, note) VALUES ($1, $2, $3) RETURNING *',
      [doctor_id, response_id, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a note
exports.updateDoctorResponseNotes = async (req, res) => {
  const { id } = req.params;
  const { doctor_id, response_id, note } = req.body;
  try {
    const result = await db.query(
      'UPDATE doctor_response_notes SET doctor_id=$1, response_id=$2, note=$3 WHERE id=$4 RETURNING *',
      [doctor_id, response_id, note, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a note
exports.deleteDoctorResponseNotes = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM doctor_response_notes WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted', note: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};