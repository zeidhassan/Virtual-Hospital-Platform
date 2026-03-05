const express = require('express');
const router = express.Router();
const doctorAppointmentsController = require('../../controllers/doctor/doctorAppointmentsController');
const { validateAddPrescription } = require('../../validators/prescriptionsValidation')
const verifyToken = require('../../middleware/verifyToken');

router.use(verifyToken);

/**
 * @swagger
 * /api/doctor/appointments:
 *   get:
 *     summary: Get all appointments for the logged-in doctor
 *     tags: [Doctor Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of appointments
 *       401:
 *         description: Unauthorized
 */
router.get('/', doctorAppointmentsController.getDoctorAppointments);

router.get('/medical-records/:appointmentId', doctorAppointmentsController.getAppointmentRecords);
/**
 * @swagger
 * /api/doctor/appointments/{id}/status:
 *   put:
 *     summary: Update the status of an appointment
 *     tags: [Doctor Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 example: completed
 *     responses:
 *       200:
 *         description: Appointment status updated
 *       403:
 *         description: Unauthorized to update this appointment
 *       404:
 *         description: Appointment not found
 */
router.put('/:id/status', doctorAppointmentsController.updateAppointmentStatus);
/**
 * @swagger
 * /api/doctor/appointments/{appointmentId}/records:
 *   post:
 *     summary: Add a medical record for an appointment
 *     tags: [Doctor Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - record_type
 *               - description
 *             properties:
 *               record_type:
 *                 type: string
 *               description:
 *                 type: string
 *               file_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Medical record added
 *       403:
 *         description: Unauthorized or invalid appointment
 *       500:
 *         description: Server error
 */
router.post('/:appointmentId/records', doctorAppointmentsController.addMedicalRecord);
/**
 * @swagger
 * /api/doctor/appointments/{appointmentId}/generate:
 *   post:
 *     summary: Generate a medical record for an appointment
 *     tags: [Doctor Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     responses:
 *       201:
 *         description: Medical record generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecord'
 *       400:
 *         description: Generation error
 *       404:
 *         description: Appointment not found
 */
router.post('/:appointmentId/generate', doctorAppointmentsController.generateMedicalRecord);
/**
 * @swagger
 * /api/appointments/{appointmentId}/prescriptions:
 *   post:
 *     summary: Add a new prescription for an appointment
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the appointment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medication
 *               - dosage
 *               - pack_limit
 *               - instructions
 *               - issued_date
 *             properties:
 *               medication:
 *                 type: string
 *                 example: Ibuprofen
 *               dosage:
 *                 type: string
 *                 example: 200mg
 *               pack_limit:
 *                 type: integer
 *                 example: 2
 *               instructions:
 *                 type: string
 *                 example: Twice daily after meals
 *               issued_date:
 *                 type: string
 *                 format: date
 *                 example: 2025-07-24
 *     responses:
 *       201:
 *         description: Prescription added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Prescription added
 *                 data:
 *                   $ref: '#/components/schemas/Prescription'
 *       400:
 *         description: Missing or invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:appointmentId/prescriptions', validateAddPrescription, doctorAppointmentsController.addPrescription);

module.exports = router;
