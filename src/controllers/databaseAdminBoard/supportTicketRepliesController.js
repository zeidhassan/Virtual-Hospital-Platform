const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all support ticket replies (admin only)
exports.getAllSupportTicketReplies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "ticket_id",
      "user_id",
      "message",
      "file_url",
      "created_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'support_ticket_replies',
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

// GET a support ticket reply by ID (admin only)
exports.getSupportTicketReplyById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM support_ticket_replies WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a support ticket reply (admin only)
exports.createSupportTicketReply = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create support ticket replies.' });
  }

  const { ticket_id, user_id, message, file_url } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO support_ticket_replies (ticket_id, user_id, message, file_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ticket_id, user_id, message, file_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE a support ticket reply (admin only)
exports.updateSupportTicketReply = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update support ticket replies.' });
  }

  const { message, file_url } = req.body;

  try {
    const result = await pool.query(
      `UPDATE support_ticket_replies
       SET message = $1, file_url = $2
       WHERE id = $3 RETURNING *`,
      [message, file_url, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE a support ticket reply (admin only)
exports.deleteSupportTicketReply = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete support ticket replies.' });
  }

  try {
    const result = await pool.query('DELETE FROM support_ticket_replies WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    res.json({ message: 'Support ticket reply deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
