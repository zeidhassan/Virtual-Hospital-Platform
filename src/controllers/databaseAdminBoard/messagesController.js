const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all messages (admin only)
exports.getAllMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "conversation_id",
      "sender_id",
      "message",
      "attachment_url",
      "attachment_type",
      "created_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'messages',
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

// GET message by ID (admin only)
exports.getMessageById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM messages WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a new message (admin only)
exports.createMessage = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create messages.' });
  }

  const { conversation_id, sender_id, message, attachment_url, attachment_type } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message, attachment_url, attachment_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [conversation_id, sender_id, message, attachment_url, attachment_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE message (admin only)
exports.updateMessage = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update messages.' });
  }

  const { message, attachment_url, attachment_type } = req.body;

  try {
    const result = await pool.query(
      `UPDATE messages SET message = $1, attachment_url = $2, attachment_type = $3 WHERE id = $4 RETURNING *`,
      [message, attachment_url, attachment_type, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE message (admin only)
exports.deleteMessage = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete messages.' });
  }

  try {
    const result = await pool.query('DELETE FROM messages WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
