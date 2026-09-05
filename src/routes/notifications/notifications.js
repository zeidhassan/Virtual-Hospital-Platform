// src/routes/notifications/notifications.js

const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/notifications/notificationsController');
const verifyToken = require('../../middleware/verifyToken');

// All routes require authentication only (no role restrictions)
router.use(verifyToken);

// Static routes before /:id param
router.get('/my',              ctrl.getMyNotifications);
router.get('/unread-count',    ctrl.getUnreadCount);
router.put('/mark-all-read',   ctrl.markAllAsRead);
router.put('/:id/read',        ctrl.markAsRead);

module.exports = router;
