const express = require('express');
const router = express.Router();
const doctorResponseNotesController = require('../../controllers/databaseAdminBoard/doctorResponseNotesController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/doctor_response_notes:
 *   get:
 *     summary: Get all doctor response notes
 *     tags: [DoctorResponseNotes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of notes
 *       401:
 *         description: Unauthorized
 */
router.get('/', doctorResponseNotesController.getAllDoctorResponseNotes);

/**
 * @swagger
 * /api/doctor_response_notes/{id}:
 *   get:
 *     summary: Get a doctor response note by ID
 *     tags: [DoctorResponseNotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note found
 *       404:
 *         description: Note not found
 */
router.get('/:id', doctorResponseNotesController.getDoctorResponseNotesById);

/**
 * @swagger
 * /api/doctor_response_notes:
 *   post:
 *     summary: Create a new doctor response note
 *     tags: [DoctorResponseNotes]
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
 *               - response_id
 *               - note
 *             properties:
 *               doctor_id:
 *                 type: integer
 *               response_id:
 *                 type: integer
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note created
 *       400:
 *         description: Invalid input
 */
router.post('/', doctorResponseNotesController.createDoctorResponseNotes);

/**
 * @swagger
 * /api/doctor_response_notes/{id}:
 *   put:
 *     summary: Update a doctor response note by ID
 *     tags: [DoctorResponseNotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Note ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doctor_id:
 *                 type: integer
 *               response_id:
 *                 type: integer
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note updated
 *       404:
 *         description: Note not found
 */
router.put('/:id', doctorResponseNotesController.updateDoctorResponseNotes);

/**
 * @swagger
 * /api/doctor_response_notes/{id}:
 *   delete:
 *     summary: Delete a doctor response note by ID
 *     tags: [DoctorResponseNotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note deleted
 *       404:
 *         description: Note not found
 */
router.delete('/:id', doctorResponseNotesController.deleteDoctorResponseNotes);

module.exports = router;