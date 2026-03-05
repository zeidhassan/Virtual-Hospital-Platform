const express = require('express');
const router = express.Router();
const { getUserProfile } = require('../../controllers/authentication/profileController');
const verifyToken = require('../../middleware/verifyToken');

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get logged-in user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyToken, getUserProfile);

module.exports = router;
