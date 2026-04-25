const db = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all questions
exports.getAllQuestionBank = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "question_text",
      "question_type",
      "specialty",
      "suggested_by",
      "is_approved",
      "created_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'question_bank',
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

// Get question by ID
exports.getQuestionBankById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM question_bank WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Create a new question
exports.createQuestionBank = async (req, res) => {
  const { question_text, question_type, specialty, suggested_by, is_approved } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO question_bank (question_text, question_type, specialty, suggested_by, is_approved) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [question_text, question_type, specialty, suggested_by, is_approved]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Update a question
exports.updateQuestionBank = async (req, res) => {
  const { id } = req.params;
  const { question_text, question_type, specialty, suggested_by, is_approved } = req.body;
  try {
    const result = await db.query(
      'UPDATE question_bank SET question_text=$1, question_type=$2, specialty=$3, suggested_by=$4, is_approved=$5 WHERE id=$6 RETURNING *',
      [question_text, question_type, specialty, suggested_by, is_approved, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// Delete a question
exports.deleteQuestionBank = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM question_bank WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted', question: result.rows[0] });
  } catch (err) {
    return handleDbError(err, res);
  }
};