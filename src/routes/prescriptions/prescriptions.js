const express = require('express');
const router = express.Router();
const {
  addPrescription,
  getPrescriptionsByPatient,
  getPrescriptionsByDoctor,
  deletePrescription
} = require('../../controllers/prescriptions/prescriptionController');

const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const { validateAddPrescription } = require('../../validators/prescriptionsValidation');

/**
 * @swagger
 * tags:
 *   name: Prescriptions
 *   description: Prescription management
 */

/**
 * @swagger
 * /api/prescriptions:
 *   post:
 *     summary: Add a new prescription
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               appointment_id:
 *                 type: integer
 *               medication:
 *                 type: string
 *               dosage:
 *                 type: string
 *               instructions:
 *                 type: string
 *               issued_date:
 *                 type: string
 *                 format: date
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Prescription added
 *       403:
 *         description: Access denied
 */
router.post('/', verifyToken, requireRole('doctor'), validateAddPrescription, addPrescription);

/**
 * @swagger
 * /api/prescriptions/patient/{id}:
 *   get:
 *     summary: Get prescriptions for a patient
 *     tags: [Prescriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Patient ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of prescriptions
 *       403:
 *         description: Access denied
 */
router.get('/patient/:id', verifyToken, requireRole(['patient', 'admin']), getPrescriptionsByPatient);

/**
 * @swagger
 * /api/prescriptions/doctor/{id}:
 *   get:
 *     summary: Get prescriptions issued by a doctor
 *     tags: [Prescriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Doctor ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of prescriptions
 *       403:
 *         description: Access denied
 */
router.get('/doctor/:id', verifyToken, requireRole(['doctor', 'admin']), getPrescriptionsByDoctor);

/**
 * @swagger
 * /api/prescriptions/{id}:
 *   delete:
 *     summary: Delete a prescription by ID
 *     tags: [Prescriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Prescription ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prescription deleted
 *       403:
 *         description: Access denied
 */
router.delete('/:id', verifyToken, requireRole(['doctor', 'admin']), deletePrescription);

module.exports = router;
