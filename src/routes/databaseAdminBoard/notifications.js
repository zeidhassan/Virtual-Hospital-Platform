const express = require('express');
const router = express.Router();
const notificationsController = require('../../controllers/databaseAdminBoard/notificationsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of notifications
 *       401:
 *         description: Unauthorized
 */
router.get('/', notificationsController.getAllNotifications);
/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     summary: Get a notification by ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification details
 *       404:
 *         description: Notification not found
 */
router.get('/:id', notificationsController.getNotificationById);
/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a new notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - body
 *             properties:
 *               user_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               is_read:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Notification created
 *       400:
 *         description: Invalid input
 */
router.post('/', notificationsController.createNotification);
/**
 * @swagger
 * /api/notifications/{id}:
 *   put:
 *     summary: Update a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               is_read:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notification updated
 *       404:
 *         description: Notification not found
 */
router.put('/:id', notificationsController.updateNotification);
/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *       404:
 *         description: Notification not found
 */
router.delete('/:id', notificationsController.deleteNotification);

module.exports = router;
