const express = require('express');
const router = express.Router();
const doctorsController = require('../../controllers/databaseAdminBoard/doctorsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Doctors (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of doctors
 *       401:
 *         description: Unauthorized
 */
router.get('/', doctorsController.getAllDoctors);
/**
 * @swagger
 * /api/doctors/{id}:
 *   get:
 *     summary: Get a doctor by ID
 *     tags: [Doctors (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: Doctor information
 *       404:
 *         description: Doctor not found
 */
router.get('/:id', doctorsController.getDoctorById);
/**
 * @swagger
 * /api/doctors:
 *   post:
 *     summary: Create a new doctor
 *     tags: [Doctors (Admin)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - specialization
 *             properties:
 *               user_id:
 *                 type: integer
 *               specialization:
 *                 type: string
 *               qualifications:
 *                 type: string
 *               availability_status:
 *                 type: string
 *               profile_picture_url:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       201:
 *         description: Doctor created
 *       400:
 *         description: Invalid input
 */
router.post('/', doctorsController.createDoctor);
/**
 * @swagger
 * /api/doctors/{id}:
 *   put:
 *     summary: Update a doctor's information
 *     tags: [Doctors (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               specialization:
 *                 type: string
 *               qualifications:
 *                 type: string
 *               availability_status:
 *                 type: string
 *               profile_picture_url:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Doctor updated
 *       404:
 *         description: Doctor not found
 */
router.put('/:id', doctorsController.updateDoctor);
/**
 * @swagger
 * /api/doctors/{id}:
 *   delete:
 *     summary: Delete a doctor by ID
 *     tags: [Doctors (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: Doctor deleted
 *       404:
 *         description: Doctor not found
 */
router.delete('/:id', doctorsController.deleteDoctor);

module.exports = router;
