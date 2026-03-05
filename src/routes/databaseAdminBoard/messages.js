const express = require('express');
const router = express.Router();
const messagesController = require('../../controllers/databaseAdminBoard/messagesController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get all messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 *       401:
 *         description: Unauthorized
 */
router.get('/', messagesController.getAllMessages);
/**
 * @swagger
 * /api/messages/{id}:
 *   get:
 *     summary: Get a specific message by ID
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message data
 *       404:
 *         description: Message not found
 */
router.get('/:id', messagesController.getMessageById);
/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Create a new message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               is_read:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Message created
 *       400:
 *         description: Invalid input
 */
router.post('/', messagesController.createMessage);
/**
 * @swagger
 * /api/messages/{id}:
 *   put:
 *     summary: Update a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               is_read:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Message updated
 *       404:
 *         description: Message not found
 */
router.put('/:id', messagesController.updateMessage);
/**
 * @swagger
 * /api/messages/{id}:
 *   delete:
 *     summary: Delete a message by ID
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted
 *       404:
 *         description: Message not found
 */
router.delete('/:id', messagesController.deleteMessage);

module.exports = router;
