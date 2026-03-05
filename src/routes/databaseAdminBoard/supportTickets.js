const express = require('express');
const router = express.Router();
const supportTicketsController = require('../../controllers/databaseAdminBoard/supportTicketsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/support-tickets:
 *   get:
 *     summary: Get all support tickets
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of support tickets
 *       401:
 *         description: Unauthorized
 */
router.get('/', supportTicketsController.getAllSupportTickets);
/**
 * @swagger
 * /api/support-tickets/{id}:
 *   get:
 *     summary: Get a support ticket by ID
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Support ticket ID
 *     responses:
 *       200:
 *         description: Support ticket details
 *       404:
 *         description: Support ticket not found
 */
router.get('/:id', supportTicketsController.getSupportTicketById);
/**
 * @swagger
 * /api/support-tickets:
 *   post:
 *     summary: Create a new support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - description
 *               - status
 *             properties:
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               created_at:
 *                 type: string
 *                 format: date-time
 *               updated_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Support ticket created
 *       400:
 *         description: Invalid input
 */
router.post('/', supportTicketsController.createSupportTicket);
/**
 * @swagger
 * /api/support-tickets/{id}:
 *   put:
 *     summary: Update a support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Support ticket ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Support ticket updated
 *       404:
 *         description: Support ticket not found
 */
router.put('/:id', supportTicketsController.updateSupportTicket);
/**
 * @swagger
 * /api/support-tickets/{id}:
 *   delete:
 *     summary: Delete a support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Support ticket ID
 *     responses:
 *       200:
 *         description: Support ticket deleted
 *       404:
 *         description: Support ticket not found
 */
router.delete('/:id', supportTicketsController.deleteSupportTicket);

module.exports = router;
