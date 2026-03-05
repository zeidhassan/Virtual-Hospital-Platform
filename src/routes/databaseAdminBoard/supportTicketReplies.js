const express = require('express');
const router = express.Router();
const supportTicketRepliesController = require('../../controllers/databaseAdminBoard/supportTicketRepliesController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))
/**
 * @swagger
 * /databaseAdminBoard/support-ticket-replies:
 *   get:
 *     summary: Get all support ticket replies
 *     tags:
 *       - Support Ticket Replies
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of support ticket replies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SupportTicketReply'
 */
router.get('/', supportTicketRepliesController.getAllSupportTicketReplies);
/**
 * @swagger
 * /databaseAdminBoard/support-ticket-replies/{id}:
 *   get:
 *     summary: Get a support ticket reply by ID
 *     tags:
 *       - Support Ticket Replies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Support ticket reply object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupportTicketReply'
 *       404:
 *         description: Not found
 */
router.get('/:id', supportTicketRepliesController.getSupportTicketReplyById);
/**
 * @swagger
 * /databaseAdminBoard/support-ticket-replies:
 *   post:
 *     summary: Add a new support ticket reply
 *     tags:
 *       - Support Ticket Replies
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupportTicketReplyCreate'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid input
 */
router.post('/', supportTicketRepliesController.createSupportTicketReply);
/**
 * @swagger
 * /databaseAdminBoard/support-ticket-replies/{id}:
 *   put:
 *     summary: Update a support ticket reply
 *     tags:
 *       - Support Ticket Replies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupportTicketReplyUpdate'
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 */
router.put('/:id', supportTicketRepliesController.updateSupportTicketReply);
/**
 * @swagger
 * /databaseAdminBoard/support-ticket-replies/{id}:
 *   delete:
 *     summary: Delete a support ticket reply
 *     tags:
 *       - Support Ticket Replies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', supportTicketRepliesController.deleteSupportTicketReply);

module.exports = router;
