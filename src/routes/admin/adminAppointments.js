const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/adminAppointmentsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);

/**
 * @swagger
 * /api/admin/appointments:
 *   get:
 *     summary: Get all appointments with filters, sorting, and pagination (admin only)
 *     tags: [Admin Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default is 1)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort by column, e.g. +appointment_date or -status
 *       - in: query
 *         name: doctor
 *         schema:
 *           type: string
 *         description: Filter by doctor full name (partial match)
 *       - in: query
 *         name: patient
 *         schema:
 *           type: string
 *         description: Filter by patient full name (partial match)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by appointment date (YYYY-MM-DD)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by appointment status
 *     responses:
 *       200:
 *         description: Paginated list of appointments
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       403:
 *         description: Forbidden - Only admins can access
 *       500:
 *         description: Internal server error
 */
router.get('/', requireRole('admin'), controller.getAllAppointments);

router.post('/', requireRole('admin'), controller.createAppointment);

router.post('/:id/remind', requireRole('admin'), controller.sendAppointmentReminder);

router.get('/available-time-slots', requireRole('admin'), controller.getAvailableTimeSlots);
/**
 * @swagger
 * /api/admin/appointments/{id}:
 *   delete:
 *     summary: Delete an appointment by ID (admin only)
 *     tags: [Admin Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment deleted
 *       403:
 *         description: Deletion forbidden (e.g., prescription exists)
 *       404:
 *         description: Appointment not found
 */
router.delete('/:id', requireRole('admin'), controller.deleteAppointment);
/**
 * @swagger
 * /api/admin/appointments/{id}/reassign:
 *   put:
 *     summary: Reassign a pending appointment to a different doctor
 *     tags: [Admin Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_doctor_id:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Appointment reassigned
 *       400:
 *         description: Invalid reassignment (e.g., doctor unavailable)
 *       404:
 *         description: Appointment not found
 */
router.put('/:id/reassign', requireRole('admin'), controller.reassignAppointment);

/**
 * @swagger
 * /api/admin/appointments/{id}:
 *   patch:
 *     summary: Update appointment status or reschedule (admin only)
 *     tags: [Admin Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: integer }
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               appointment_date: { type: string, format: date }
 *               appointment_start_time: { type: string }
 *               appointment_end_time: { type: string }
 *     responses:
 *       200:
 *         description: Appointment updated
 */
router.patch('/:id', requireRole('admin'), controller.updateAppointment);

module.exports = router;
