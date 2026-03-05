/**
 * @swagger
 * tags:
 *   name: DoctorTimeSlots
 *   description: Manage your own time slots
 */

const express     = require('express');
const router      = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const {
  getDoctorTimeSlots,
  createDoctorTimeSlot,
  updateDoctorTimeSlot,
  deleteDoctorTimeSlot
} = require('../../controllers/doctor/doctorTimeSlotsController');

// protect all these routes: must be logged-in doctor
router.use(verifyToken, requireRole('doctor'));

/**
 * @swagger
 * /api/doctor/slots:
 *   get:
 *     summary: List all time slots for the authenticated doctor
 *     tags: [DoctorTimeSlots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of time slots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DoctorTimeSlot'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Doctor profile not found
 *       500:
 *         description: Server error
 */
router.get('/', getDoctorTimeSlots);

/**
 * @swagger
 * /api/doctor/slots:
 *   post:
 *     summary: Create a new time slot for yourself
 *     tags: [DoctorTimeSlots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [day_of_week, start_time, end_time]
 *             properties:
 *               day_of_week:
 *                 type: string
 *               start_time:
 *                 type: string
 *                 format: time
 *               end_time:
 *                 type: string
 *                 format: time
 *     responses:
 *       201:
 *         description: Time slot created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorTimeSlot'
 *       400:
 *         description: Missing or invalid fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Doctor profile not found
 *       500:
 *         description: Server error
 */
router.post('/', createDoctorTimeSlot);

/**
 * @swagger
 * /api/doctor/slots/{id}:
 *   put:
 *     summary: Update one of your time slots
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [day_of_week, start_time, end_time]
 *             properties:
 *               day_of_week:
 *                 type: string
 *               start_time:
 *                 type: string
 *                 format: time
 *               end_time:
 *                 type: string
 *                 format: time
 *     responses:
 *       200:
 *         description: Updated time slot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorTimeSlot'
 *       400:
 *         description: Missing or invalid fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Time slot not found or not yours
 *       500:
 *         description: Server error
 */
router.put('/:id', updateDoctorTimeSlot);

/**
 * @swagger
 * /api/doctor/slots/{id}:
 *   delete:
 *     summary: Delete one of your time slots
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
 *         description: Deleted time slot
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Time slot not found or not yours
 *       500:
 *         description: Server error
 */
router.delete('/:id', deleteDoctorTimeSlot);

module.exports = router;
