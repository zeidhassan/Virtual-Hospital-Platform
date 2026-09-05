const express = require('express');
const router = express.Router();
const { deleteRecord } = require('../../controllers/medicalRecords/medicalRecordController');

const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');

/**
 * @swagger
 * tags:
 *   name: Medical Records
 *   description: Medical record management
 */

// Uploading and listing records now happen through the role-scoped routes in
// /api/doctor/patients/:patientId/records and /api/patient/records — this
// module only keeps the delete capability, which has no equivalent there yet.

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
