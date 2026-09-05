const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllQuestionAssignments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'question_id', 'patient_id', 'doctor_id', 'response_id', 'assigned_at'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'question_assignments',
      page,
      limit,
      sort,
      filters,
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

exports.getQuestionAssignmentById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM question_assignments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question assignment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createQuestionAssignment = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create question assignments.' });
  }

  const { question_id, patient_id, doctor_id, response_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO question_assignments (question_id, patient_id, doctor_id, response_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [question_id, patient_id, doctor_id, response_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updateQuestionAssignment = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update question assignments.' });
  }

  const { response_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE question_assignments
       SET response_id=$1
       WHERE id=$2 RETURNING *`,
      [response_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question assignment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deleteQuestionAssignment = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete question assignments.' });
  }

  try {
    const result = await pool.query('DELETE FROM question_assignments WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question assignment not found' });
    }

    res.json({ message: 'Question assignment deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
