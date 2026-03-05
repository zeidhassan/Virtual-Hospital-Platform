const express = require('express');
const router = express.Router();
const doctorSubscriptionsController = require('../../controllers/databaseAdminBoard/doctorSubscriptionsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/doctor_subscriptions:
 *   get:
 *     summary: Get all doctor subscriptions
 *     tags: [DoctorSubscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of doctor subscriptions
 *       401:
 *         description: Unauthorized
 */
router.get('/', doctorSubscriptionsController.getAllDoctorSubscriptions);

/**
 * @swagger
 * /api/doctor_subscriptions/{id}:
 *   get:
 *     summary: Get a doctor subscription by ID
 *     tags: [DoctorSubscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Doctor subscription ID
 *     responses:
 *       200:
 *         description: Doctor subscription found
 *       404:
 *         description: Doctor subscription not found
 */
router.get('/:id', doctorSubscriptionsController.getDoctorSubscriptionsById);

/**
 * @swagger
 * /api/doctor_subscriptions:
 *   post:
 *     summary: Create a new doctor subscription
 *     tags: [DoctorSubscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - plan_id
 *               - billing_cycle
 *             properties:
 *               user_id:
 *                 type: integer
 *               plan_id:
 *                 type: integer
 *               billing_cycle:
 *                 type: string
 *               status:
 *                 type: string
 *               paperwork_url:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               admin_notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Doctor subscription created
 *       400:
 *         description: Invalid input
 */
router.post('/', doctorSubscriptionsController.createDoctorSubscriptions);

/**
 * @swagger
 * /api/doctor_subscriptions/{id}:
 *   put:
 *     summary: Update a doctor subscription by ID
 *     tags: [DoctorSubscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Doctor subscription ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *               plan_id:
 *                 type: integer
 *               billing_cycle:
 *                 type: string
 *               status:
 *                 type: string
 *               paperwork_url:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               admin_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Doctor subscription updated
 *       404:
 *         description: Doctor subscription not found
 */
router.put('/:id', doctorSubscriptionsController.updateDoctorSubscriptions);

/**
 * @swagger
 * /api/doctor_subscriptions/{id}:
 *   delete:
 *     summary: Delete a doctor subscription by ID
 *     tags: [DoctorSubscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Doctor subscription ID
 *     responses:
 *       200:
 *         description: Doctor subscription deleted
 *       404:
 *         description: Doctor subscription not found
 */
router.delete('/:id', doctorSubscriptionsController.deleteDoctorSubscriptions);

module.exports = router;
