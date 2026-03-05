// src/routes/admin/adminDoctorPlans.js

const express = require('express');
const router = express.Router();

const adminDoctorPlansController = require('../../controllers/admin/adminDoctorPlansController');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');

// Ensure only Admins can access these
router.use(verifyToken);
router.use(requireRole('admin'));
/**
 * @swagger
 * /admin/doctor-plans/doctors-by-plan:
 *   get:
 *     summary: Get doctors grouped by plan
 *     tags:
 *       - Admin - Doctor Plans
 *     responses:
 *       200:
 *         description: List of doctors grouped by plan
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DoctorPlanGroup'
 */
// 1) View all subscribed doctors by plan
router.get('/doctors-by-plan', adminDoctorPlansController.getDoctorsByPlan);
/**
 * @swagger
 * /admin/doctor-plans/doctor-plans/{id}:
 *   put:
 *     summary: Update a doctor plan by ID
 *     tags:
 *       - Admin - Doctor Plans
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DoctorPlanUpdate'
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Plan not found
 */
// 2) Update doctor plan
router.put('/doctor-plans/:id', adminDoctorPlansController.updateDoctorPlan);
/**
 * @swagger
 * /admin/doctor-plans/subscription-stats:
 *   get:
 *     summary: Get doctor subscription statistics
 *     tags:
 *       - Admin - Doctor Plans
 *     responses:
 *       200:
 *         description: Subscription statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionStats'
 */
// 3) Real-time subscription stats
router.get('/subscription-stats', adminDoctorPlansController.getSubscriptionStats);

module.exports = router;
