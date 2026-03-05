const express = require('express');
const router = express.Router();
const doctorTimeSlotsController = require('../../controllers/databaseAdminBoard/doctorTimeSlotsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/doctor_time_slots:
 *   get:
 *     summary: Get all doctor time slots
 *     tags: [DoctorTimeSlots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of time slots
 *       401:
 *         description: Unauthorized
 */
router.get('/', doctorTimeSlotsController.getAllDoctorTimeSlots);

/**
 * @swagger
 * /api/doctor-time-slots/search:
 *   get:
 *     summary: Search doctor time slots by name, date, and time (admin only)
 *     tags: [Doctor Time Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: name
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Partial or full doctor name
 *       - name: date
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Specific date to match the day column
 *       - name: time
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: time
 *         description: Time to check if it falls within start_time and end_time
 *     responses:
 *       200:
 *         description: List of matching doctor time slots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   doctor_id:
 *                     type: integer
 *                   day:
 *                     type: string
 *                   start_time:
 *                     type: string
 *                   end_time:
 *                     type: string
 *       403:
 *         description: Forbidden - only accessible by admins
 *       500:
 *         description: Internal server error
 */
router.get('/search', doctorTimeSlotsController.searchDoctorTimeSlots);

/**
 * @swagger
 * /api/doctor_time_slots/{id}:
 *   get:
 *     summary: Get a doctor time slot by ID
 *     tags: [DoctorTimeSlots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Time slot ID
 *     responses:
 *       200:
 *         description: Time slot found
 *       404:
 *         description: Time slot not found
 */
router.get('/:id', doctorTimeSlotsController.getDoctorTimeSlotsById);

/**
 * @swagger
 * /api/doctor_time_slots:
 *   post:
 *     summary: Create a new doctor time slot
 *     tags: [DoctorTimeSlots]
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
 *               - day_of_week
 *               - start_time
 *               - end_time
 *             properties:
 *               doctor_id:
 *                 type: integer
 *               day_of_week:
 *                 type: string
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *     responses:
 *       201:
 *         description: Time slot created
 *       400:
 *         description: Invalid input
 */
router.post('/', doctorTimeSlotsController.createDoctorTimeSlots);

/**
 * @swagger
 * /api/doctor_time_slots/{id}:
 *   put:
 *     summary: Update a doctor time slot by ID
 *     tags: [DoctorTimeSlots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Time slot ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doctor_id:
 *                 type: integer
 *               day_of_week:
 *                 type: string
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *     responses:
 *       200:
 *         description: Time slot updated
 *       404:
 *         description: Time slot not found
 */
router.put('/:id', doctorTimeSlotsController.updateDoctorTimeSlots);

/**
 * @swagger
 * /api/doctor_time_slots/{id}:
 *   delete:
 *     summary: Delete a doctor time slot by ID
 *     tags: [DoctorTimeSlots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Time slot ID
 *     responses:
 *       200:
 *         description: Time slot deleted
 *       404:
 *         description: Time slot not found
 */
router.delete('/:id', doctorTimeSlotsController.deleteDoctorTimeSlots);

module.exports = router;