const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../../controllers/payments/webhookController');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Webhook to update bill status and optionally start subscription
 *     tags: [Billing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bill_id:
 *                 type: integer
 *               patient_id:
 *                 type: integer
 *               plan_name:
 *                 type: string
 *               auto_renew:
 *                 type: boolean
 *               duration_days:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Missing fields
 *       500:
 *         description: Server error
 */
router.post('/', handleWebhook);

module.exports = router;
