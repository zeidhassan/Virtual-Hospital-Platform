const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const ctrl = require('../../controllers/payments/paypalController');

router.use(verifyToken);

// Only patients may start/finish a checkout session (your project rule)
/**
 * @swagger
 * /api/payments/paypal/create-order:
 *   post:
 *     summary: Create a PayPal Checkout order
 *     description: >
 *       Creates a PayPal order with intent **CAPTURE** and returns the PayPal `order id`.
 *       The buyer must approve the order in the PayPal popup (front-end) before capture.
 *     tags: [Payments - PayPal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayPalCreateOrderRequest'
 *           examples:
 *             default:
 *               value:
 *                 amount: "10.00"
 *                 currency_code: "USD"
 *                 description: "Virtual Hospital Platform test payment"
 *     responses:
 *       '200':
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPalCreateOrderResponse'
 *             examples:
 *               ok:
 *                 value:
 *                   id: "5O190127TN364715T"
 *                   status: "CREATED"
 *       '400':
 *         description: Invalid input (e.g., amount format)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized (missing/invalid JWT)
 *       '403':
 *         description: Forbidden (role not allowed)
 *       '500':
 *         description: Server error creating order
 */
router.post('/create-order', requireRole('patient'), ctrl.createOrder);

/**
 * @swagger
 * /api/payments/paypal/capture-order/{orderId}:
 *   post:
 *     summary: Capture an approved PayPal order
 *     description: >
 *       Captures a previously **approved** PayPal order. On success:
 *       - returns `status: COMPLETED`
 *       - upserts a PayPal row in `payment_methods` for the user
 *       - can optionally mark it as default via `makeDefault=1`
 *     tags: [Payments - PayPal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: The PayPal order ID returned by create-order (e.g., `5O190127TN364715T`)
 *         schema:
 *           type: string
 *       - in: query
 *         name: makeDefault
 *         required: false
 *         description: >
 *           If truthy (1/true/yes/on), set this PayPal method as the user's default.
 *         schema:
 *           type: string
 *           example: "1"
 *     responses:
 *       '200':
 *         description: Capture completed and payment method saved/updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPalCaptureOrderResponse'
 *             examples:
 *               ok:
 *                 value:
 *                   status: "COMPLETED"
 *                   order_id: "5O190127TN364715T"
 *                   payment_method_id: 7
 *                   provider: "paypal"
 *                   paypal_payer_id: "QYR5Z8XDVJNXQ"
 *                   paypal_email: "sb-buyer@example.com"
 *       '400':
 *         description: Order not approved / invalid order id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notApproved:
 *                 value:
 *                   error: "Order not completed"
 *       '401':
 *         description: Unauthorized (missing/invalid JWT)
 *       '403':
 *         description: Forbidden (role not allowed)
 *       '500':
 *         description: Server error capturing order
 */
router.post('/capture-order/:orderId', requireRole('patient'), ctrl.captureOrder);

// Optional webhook (uncomment route + controller if/when you enable webhooks)
// router.post('/webhook', express.raw({type: 'application/json'}), ctrl.webhook);

module.exports = router;
