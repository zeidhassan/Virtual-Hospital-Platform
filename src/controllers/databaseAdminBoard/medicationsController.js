const db = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all medications
exports.getAllMedications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "name",
      "type",
      "description",
      "price",
      "photo_url"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'medications',
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

// Get medication by ID
exports.getMedicationById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM medications WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medication not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Create a new medication
exports.createMedication = async (req, res) => {
  const { name, type, description, price, photo_url } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO medications (name, type, description, price, photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, description, price, photo_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Update a medication
exports.updateMedication = async (req, res) => {
  const { id } = req.params;
  const { name, type, description, price, photo_url } = req.body;
  try {
    const result = await db.query(
      'UPDATE medications SET name=$1, type=$2, description=$3, price=$4, photo_url=$5 WHERE id=$6 RETURNING *',
      [name, type, description, price, photo_url, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medication not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Delete a medication
exports.deleteMedication = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM medications WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medication not found' });
    res.json({ message: 'Medication deleted', medication: result.rows[0] });
  } catch (err) {
    return handleDbError(err, res);
  }
};