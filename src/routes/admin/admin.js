// routes/admin/admin.js
const express = require('express');
const router = express.Router();
const adminPasswordsController = require('../../controllers/admin/adminPasswordsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);

// GET /api/admin/passwords

/**
 * @swagger
 * /api/admin/passwords:
 *   get:
 *     summary: Retrieve all plaintext passwords (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all user passwords
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   email:
 *                     type: string
 *                   password:
 *                     type: string
 *       403:
 *         description: Forbidden - Admin access required
 *       401:
 *         description: Unauthorized - Missing or invalid token
 */
router.get('/passwords', requireRole('admin'), adminPasswordsController.getPlainPasswords);

module.exports = router;
