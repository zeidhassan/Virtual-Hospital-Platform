const pool = require('../../config/db');
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination');

exports.getAllConversationParticipants = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = ['id', 'conversation_id', 'user_id', 'joined_at', 'last_read_at', 'is_pinned'];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'conversation_participants',
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

exports.getConversationParticipantById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM conversation_participants WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation participant not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.createConversationParticipant = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can add conversation participants.' });
  }

  const { conversation_id, user_id, is_pinned } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, is_pinned)
       VALUES ($1, $2, $3) RETURNING *`,
      [conversation_id, user_id, is_pinned]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.updateConversationParticipant = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update conversation participants.' });
  }

  const { is_pinned } = req.body;

  try {
    const result = await pool.query(
      `UPDATE conversation_participants
       SET is_pinned=$1
       WHERE id=$2 RETURNING *`,
      [is_pinned, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation participant not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

exports.deleteConversationParticipant = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can remove conversation participants.' });
  }

  try {
    const result = await pool.query('DELETE FROM conversation_participants WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation participant not found' });
    }

    res.json({ message: 'Conversation participant removed successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
