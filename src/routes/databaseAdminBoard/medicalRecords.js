const express = require('express');
const router = express.Router();
const medicalRecordsController = require('../../controllers/databaseAdminBoard/medicalRecordsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/medical-records:
 *   get:
 *     summary: Get all medical records
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of medical records
 *       401:
 *         description: Unauthorized
 */
router.get('/', medicalRecordsController.getAllMedicalRecords);
/**
 * @swagger
 * /api/medical-records/{id}:
 *   get:
 *     summary: Get a medical record by ID
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medical record ID
 *     responses:
 *       200:
 *         description: Medical record details
 *       404:
 *         description: Record not found
 */
router.get('/:id', medicalRecordsController.getMedicalRecordById);
/**
 * @swagger
 * /api/medical-records:
 *   post:
 *     summary: Create a new medical record
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - record_type
 *             properties:
 *               patient_id:
 *                 type: integer
 *               record_type:
 *                 type: string
 *               description:
 *                 type: string
 *               file_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Record created
 *       400:
 *         description: Invalid input
 */
router.post('/', medicalRecordsController.createMedicalRecord);
/**
 * @swagger
 * /api/medical-records/{id}:
 *   put:
 *     summary: Update a medical record
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               record_type:
 *                 type: string
 *               description:
 *                 type: string
 *               file_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record updated
 *       404:
 *         description: Record not found
 */
router.put('/:id', medicalRecordsController.updateMedicalRecord);
/**
 * @swagger
 * /api/medical-records/{id}:
 *   delete:
 *     summary: Delete a medical record by ID
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medical record ID
 *     responses:
 *       200:
 *         description: Record deleted
 *       404:
 *         description: Record not found
 */
router.delete('/:id', medicalRecordsController.deleteMedicalRecord);

module.exports = router;
