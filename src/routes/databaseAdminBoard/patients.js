const express = require('express');
const router = express.Router();
const patientsController = require('../../controllers/databaseAdminBoard/patientsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of patients
 *       401:
 *         description: Unauthorized
 */
router.get('/', patientsController.getAllPatients);
/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Get a patient by ID
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient details
 *       404:
 *         description: Patient not found
 */
router.get('/:id', patientsController.getPatientById);
/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Create a new patient
 *     tags: [Patients]
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
 *             properties:
 *               user_id:
 *                 type: integer
 *               blood_group:
 *                 type: string
 *               emergency_contact_name:
 *                 type: string
 *               emergency_contact_phone:
 *                 type: string
 *               address:
 *                 type: string
 *               allergies:
 *                 type: string
 *               chronic_conditions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Patient created
 *       400:
 *         description: Invalid input
 */
router.post('/', patientsController.createPatient);
/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Update patient details
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blood_group:
 *                 type: string
 *               emergency_contact_name:
 *                 type: string
 *               emergency_contact_phone:
 *                 type: string
 *               address:
 *                 type: string
 *               allergies:
 *                 type: string
 *               chronic_conditions:
 *                 type: string
 *     responses:
 *       200:
 *         description: Patient updated
 *       404:
 *         description: Patient not found
 */
router.put('/:id', patientsController.updatePatient);
/**
 * @swagger
 * /api/patients/{id}:
 *   delete:
 *     summary: Delete a patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient deleted
 *       404:
 *         description: Patient not found
 */
router.delete('/:id', patientsController.deletePatient);

module.exports = router;
