const db = require('../../config/db');
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all responses
exports.getAllPatientQuestionResponses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "patient_id",
      "question_id",
      "answer",
      "created_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'patient_question_responses',
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

// Get response by ID
exports.getPatientQuestionResponsesById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM patient_question_responses WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Response not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new response
exports.createPatientQuestionResponses = async (req, res) => {
  const { patient_id, question_id, answer } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO patient_question_responses (patient_id, question_id, answer) VALUES ($1, $2, $3) RETURNING *',
      [patient_id, question_id, answer]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a response
exports.updatePatientQuestionResponses = async (req, res) => {
  const { id } = req.params;
  const { patient_id, question_id, answer } = req.body;
  try {
    const result = await db.query(
      'UPDATE patient_question_responses SET patient_id=$1, question_id=$2, answer=$3 WHERE id=$4 RETURNING *',
      [patient_id, question_id, answer, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Response not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a response
exports.deletePatientQuestionResponses = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM patient_question_responses WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Response not found' });
    res.json({ message: 'Response deleted', response: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};