const express = require('express');
const router = express.Router();
const doctorPlansController = require('../../controllers/databaseAdminBoard/doctorPlansController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/doctor_plans:
 *   get:
 *     summary: Get all doctor plans
 *     tags: [DoctorPlans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of doctor plans
 *       401:
 *         description: Unauthorized
 */
router.get('/', doctorPlansController.getAllDoctorPlans);

/**
 * @swagger
 * /api/doctor_plans/{id}:
 *   get:
 *     summary: Get a doctor plan by ID
 *     tags: [DoctorPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Doctor plan ID
 *     responses:
 *       200:
 *         description: Doctor plan found
 *       404:
 *         description: Doctor plan not found
 */
router.get('/:id', doctorPlansController.getDoctorPlansById);

/**
 * @swagger
 * /api/doctor_plans:
 *   post:
 *     summary: Create a new doctor plan
 *     tags: [DoctorPlans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - monthly_price
 *               - yearly_price
 *               - features
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               monthly_price:
 *                 type: number
 *               yearly_price:
 *                 type: number
 *               features:
 *                 type: object
 *               currency:
 *                 type: string
 *     responses:
 *       201:
 *         description: Doctor plan created
 *       400:
 *         description: Invalid input
 */
router.post('/', doctorPlansController.createDoctorPlans);

/**
 * @swagger
 * /api/doctor_plans/{id}:
 *   put:
 *     summary: Update a doctor plan by ID
 *     tags: [DoctorPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Doctor plan ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               monthly_price:
 *                 type: number
 *               yearly_price:
 *                 type: number
 *               features:
 *                 type: object
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Doctor plan updated
 *       404:
 *         description: Doctor plan not found
 */
router.put('/:id', doctorPlansController.updateDoctorPlans);

/**
 * @swagger
 * /api/doctor_plans/{id}:
 *   delete:
 *     summary: Delete a doctor plan by ID
 *     tags: [DoctorPlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Doctor plan ID
 *     responses:
 *       200:
 *         description: Doctor plan deleted
 *       404:
 *         description: Doctor plan not found
 */
router.delete('/:id', doctorPlansController.deleteDoctorPlans);

module.exports = router;