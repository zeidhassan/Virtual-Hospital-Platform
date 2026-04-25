// src/routes/doctor/doctorSubscriptions.js

const express = require('express');
const router = express.Router();
const doctorSubscriptionController = require('../../controllers/doctor/doctorSubscriptionController');
const verifyToken = require('../../middleware/verifyToken');
/**
 * @swagger
 * /doctor/doctor-subscriptions/plans:
 *   get:
 *     summary: Get all available doctor subscription plans
 *     tags:
 *       - Doctor - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubscriptionPlan'
 */
// GET plans
router.get('/plans', verifyToken, doctorSubscriptionController.getDoctorPlans);
/**
 * @swagger
 * /doctor/doctor-subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to a doctor plan (authenticated doctor)
 *     tags:
 *       - Doctor - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         description: Invalid input
 */
// POST subscribe to plan (authenticated)
router.post('/subscribe', verifyToken, doctorSubscriptionController.createDoctorSubscription);
/**
 * @swagger
 * /doctor/doctor-subscriptions/current:
 *   get:
 *     summary: Get the current subscription for the authenticated doctor
 *     tags:
 *       - Doctor - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current doctor subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorSubscription'
 *       404:
 *         description: Not found
 */
// GET /doctor/subscriptions/current
router.get('/current', verifyToken, doctorSubscriptionController.getCurrentDoctorSubscription
);
/**
 * @swagger
 * /doctor/doctor-subscriptions/{id}:
 *   put:
 *     summary: Update a doctor subscription by ID
 *     tags:
 *       - Doctor - Subscriptions
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
 *             $ref: '#/components/schemas/DoctorSubscriptionUpdate'
 *     responses:
 *       200:
 *         description: Updated successfully
 *       404:
 *         description: Subscription not found
 */
// PUT /doctor/subscriptions/:id
router.put('/:id', verifyToken, doctorSubscriptionController.updateDoctorSubscription
);

module.exports = router;
