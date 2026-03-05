const express = require('express');
const router = express.Router();
const {
  subscribeToPlan,
  getActiveSubscription,
  updateSubscription,
  autoRenewSubscriptions
} = require('../../controllers/payments/subscriptionController');

const requireRole = require('../../middleware/requireRole'); //not used yet
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);

/**
 * @swagger
 * /api/payments/subscriptions:
 *   post:
 *     summary: Subscribe to a plan
 *     tags: [Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patient_id:
 *                 type: integer
 *               plan_id:
 *                 type: integer
 *               auto_renew:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Subscription created
 *       400:
 *         description: Already subscribed
 */
router.post('/', subscribeToPlan);

/**
 * @swagger
 * /api/payments/subscriptions/patient/{id}:
 *   get:
 *     summary: View active subscription for a patient
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Active subscription found
 *       404:
 *         description: No active subscription
 */
router.get('/patient/:id', getActiveSubscription);

/**
 * @swagger
 * /api/payments/subscriptions/{id}:
 *   put:
 *     summary: Cancel or renew a subscription
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [cancel, renew]
 *     responses:
 *       200:
 *         description: Subscription updated
 *       400:
 *         description: Invalid action
 */
router.put('/:id', updateSubscription);

/**
 * @swagger
 * /api/payments/subscriptions/auto-renew:
 *   post:
 *     summary: Auto-renew expired subscriptions (cron job trigger)
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Renewed subscriptions
 */
router.post('/auto-renew', autoRenewSubscriptions);

module.exports = router;
