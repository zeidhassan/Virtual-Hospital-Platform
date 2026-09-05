const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all notifications (admin only)
exports.getAllNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "user_id",
      "title",
      "body",
      "is_read",
      "type",
      "category",
      "actor_name",
      "actor_role",
      "created_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'notifications',
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

// GET notification by ID (admin only)
exports.getNotificationById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a notification (admin only)
exports.createNotification = async (req, res) => {
  const { user_id, title, body, is_read, type, category, actor_name, actor_role } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, body, is_read, type, category, actor_name, actor_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user_id, title, body, is_read, type, category, actor_name, actor_role]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE a notification (admin only)
exports.updateNotification = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update notifications.' });
  }

  const { title, body, is_read, type, category, actor_name, actor_role } = req.body;

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET title = $1, body = $2, is_read = $3, type = $4, category = $5, actor_name = $6, actor_role = $7
       WHERE id = $8 RETURNING *`,
      [title, body, is_read, type, category, actor_name, actor_role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE a notification (admin only)
exports.deleteNotification = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete notifications.' });
  }

  try {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
