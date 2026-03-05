const express = require('express');
const router = express.Router();
const { createOrder, captureOrder } = require('../../controllers/payments/paymentsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create a new PayPal order
 *     tags: [Billing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 example: "29.99"
 *     responses:
 *       200:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post('/create-order', requireRole('patient'), createOrder);

/**
 * @swagger
 * /api/payments/capture-order:
 *   post:
 *     summary: Capture an approved PayPal order
 *     tags: [Billing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderID:
 *                 type: string
 *                 example: "5O190127TN364715T"
 *     responses:
 *       200:
 *         description: Order captured successfully
 *       500:
 *         description: Server error
 */
router.post('/capture-order', captureOrder);

module.exports = router;
