const express = require('express');
const router = express.Router();
const subscriptionsController = require('../../controllers/databaseAdminBoard/subscriptionsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get all subscription records
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of subscriptions
 *       401:
 *         description: Unauthorized
 */
router.get('/', subscriptionsController.getAllSubscriptions);
/**
 * @swagger
 * /api/subscriptions/{id}:
 *   get:
 *     summary: Get a subscription by ID
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription data
 *       404:
 *         description: Subscription not found
 */
router.get('/:id', subscriptionsController.getSubscriptionById);
/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan_name
 *               - start_date
 *               - end_date
 *             properties:
 *               plan_name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               auto_renew:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Subscription created
 *       400:
 *         description: Invalid input
 */
router.post('/', subscriptionsController.createSubscription);
/**
 * @swagger
 * /api/subscriptions/{id}:
 *   put:
 *     summary: Update a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan_name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               auto_renew:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Subscription updated
 *       404:
 *         description: Subscription not found
 */
router.put('/:id', subscriptionsController.updateSubscription);
/**
 * @swagger
 * /api/subscriptions/{id}:
 *   delete:
 *     summary: Delete a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription deleted
 *       404:
 *         description: Subscription not found
 */
router.delete('/:id', subscriptionsController.deleteSubscription);

module.exports = router;
