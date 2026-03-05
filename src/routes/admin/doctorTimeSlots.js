/**
 * @swagger
 * tags:
 *   name: AdminDoctorTimeSlots
 *   description: Admin management of all doctors’ time slots
 */

const express     = require('express');
const router      = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const {
  getAllDoctorTimeSlots,
  createDoctorTimeSlots,
  updateDoctorTimeSlots,
  deleteDoctorTimeSlots
} = require('../../controllers/admin/doctorTimeSlotsController');

// protect all these routes: must be logged-in admin
router.use(verifyToken, requireRole('admin'));

/**
 * @swagger
 * /api/admin/doctor-slots:
 *   get:
 *     summary: Retrieve doctor time slots or list of doctors
 *     tags: [AdminDoctorTimeSlots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: list_only
 *         schema:
 *           type: boolean
 *         description: If true, returns list of doctors (id + full_name)
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: integer
 *         description: If set, returns time slots only for that doctor
 *     responses:
 *       200:
 *         description: Array of doctors or doctor time slots
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       full_name:
 *                         type: string
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/DoctorTimeSlot'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/', getAllDoctorTimeSlots);

/**
 * @swagger
 * /api/admin/doctor-slots:
 *   post:
 *     summary: Create a time slot for any doctor
 *     tags: [AdminDoctorTimeSlots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctor_id, day_of_week, start_time, end_time]
 *             properties:
 *               doctor_id:
 *                 type: integer
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
 *       500:
 *         description: Server error
 */
router.post('/', createDoctorTimeSlots);

/**
 * @swagger
 * /api/admin/doctor-slots/{id}:
 *   put:
 *     summary: Update any doctor’s time slot
 *     tags: [AdminDoctorTimeSlots]
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
 *             required: [doctor_id, day_of_week, start_time, end_time]
 *             properties:
 *               doctor_id:
 *                 type: integer
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
 *         description: Time slot not found
 *       500:
 *         description: Server error
 */
router.put('/:id', updateDoctorTimeSlots);

/**
 * @swagger
 * /api/admin/doctor-slots/{id}:
 *   delete:
 *     summary: Delete any doctor’s time slot
 *     tags: [AdminDoctorTimeSlots]
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
 *         description: Time slot not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', deleteDoctorTimeSlots);

module.exports = router;
