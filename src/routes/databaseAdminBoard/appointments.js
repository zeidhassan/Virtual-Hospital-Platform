const express = require('express');
const router = express.Router();
const appointmentsController = require('../../controllers/databaseAdminBoard/appointmentsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
const {
  validateCreateAppointment,
  validateUpdateAppointment
} = require('../../validators/appointmentsValidation');

router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get all appointments (admin)
 *     tags: [Appointments (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of appointments
 *       401:
 *         description: Unauthorized
 */
router.get('/', appointmentsController.getAllAppointments);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [Appointments (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Appointment details
 *       404:
 *         description: Appointment not found
 */
router.get('/:id', appointmentsController.getAppointmentById);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create a new appointment (admin)
 *     tags: [Appointments (Admin)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctor_id
 *               - patient_id
 *               - appointment_date
 *               - appointment_start_time
 *               - appointment_end_time
 *             properties:
 *               doctor_id:
 *                 type: integer
 *               patient_id:
 *                 type: integer
 *               appointment_date:
 *                 type: string
 *                 format: date
 *               appointment_start_time:
 *                 type: string
 *               appointment_end_time:
 *                 type: string
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appointment created
 *       400:
 *         description: Bad input
 */
router.post('/', validateCreateAppointment, appointmentsController.createAppointment);

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Update an appointment by ID
 *     tags: [Appointments (Admin)]
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
 *             type: object
 *             properties:
 *               doctor_id:
 *                 type: integer
 *               patient_id:
 *                 type: integer
 *               appointment_date:
 *                 type: string
 *                 format: date
 *               appointment_start_time:
 *                 type: string
 *               appointment_end_time:
 *                 type: string
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment updated
 *       404:
 *         description: Appointment not found
 */
router.put('/:id', validateUpdateAppointment, appointmentsController.updateAppointment);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Delete an appointment by ID
 *     tags: [Appointments (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Appointment deleted
 *       404:
 *         description: Appointment not found
 */
router.delete('/:id', appointmentsController.deleteAppointment);

module.exports = router;
