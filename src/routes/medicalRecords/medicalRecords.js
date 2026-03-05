const express = require('express');
const router = express.Router();
const {
  addMedicalRecord,
  getRecordsByPatient,
  getRecordsByDoctor,
  deleteRecord
} = require('../../controllers/medicalRecords/medicalRecordController');

const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');

/**
 * @swagger
 * tags:
 *   name: Medical Records
 *   description: Medical record management
 */

router.post('/', verifyToken, requireRole(['patient', 'doctor']), addMedicalRecord);

/**
 * @swagger
 * /api/medical-records/patient/{id}:
 *   get:
 *     summary: Get medical records for a patient
 *     tags: [Medical Records]
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
 *         description: List of medical records
 *       403:
 *         description: Access denied
 */
router.get('/patient/:id', verifyToken, requireRole(['patient', 'admin']), getRecordsByPatient);

/**
 * @swagger
 * /api/medical-records/doctor/{id}:
 *   get:
 *     summary: Get medical records uploaded by a doctor
 *     tags: [Medical Records]
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
 *         description: List of medical records
 *       403:
 *         description: Access denied
 */
router.get('/doctor/:id', verifyToken, requireRole(['doctor', 'admin']), getRecordsByDoctor);

/**
 * @swagger
 * /api/medical-records/{id}:
 *   delete:
 *     summary: Delete a medical record by ID
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Record ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Record deleted
 *       403:
 *         description: Access denied
 */
router.delete('/:id', verifyToken, requireRole(['doctor', 'admin']), deleteRecord);

module.exports = router;
