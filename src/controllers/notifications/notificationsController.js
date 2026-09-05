// src/controllers/notifications/notificationsController.js

const db = require('../../config/db');

// GET /api/notifications/my — all notifications for current user (newest first)
exports.getMyNotifications = async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  // `page` takes priority when given (the shared frontend pagination hook
  // sends page/limit); `offset` stays supported directly for any other caller.
  const page = parseInt(req.query.page) || null;
  const offset = page ? (page - 1) * limit : parseInt(req.query.offset) || 0;
  const unreadOnly = req.query.unread === 'true';

  try {
    const where = unreadOnly
      ? 'WHERE user_id = $1 AND is_read = FALSE'
      : 'WHERE user_id = $1';

    const [data, count] = await Promise.all([
      db.query(
        `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM notifications ${where}`, [userId]),
    ]);
    const total = parseInt(count.rows[0].count);
    res.json({
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      totalItems: total,
      data: data.rows,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/notifications/unread-count — badge count for topbar
exports.getUnreadCount = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/notifications/:id/read — mark a single notification as read
exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  const notifId = parseInt(req.params.id);
  if (isNaN(notifId)) return res.status(400).json({ error: 'Invalid notification ID.' });
  try {
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
      [notifId, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/notifications/mark-all-read — mark all as read
exports.markAllAsRead = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    res.json({ message: 'All notifications marked as read.', updated: result.rowCount });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
