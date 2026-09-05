const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyToken')
const fileController = require('../../controllers/Files/fileController'); 

// Secure access to prescription files
/**
 * @swagger
 * /api/files/prescriptions/{filename}:
 *   get:
 *     summary: Retrieve a prescription file by filename
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Filename of the prescription
 *     responses:
 *       200:
 *         description: File retrieved
 *       404:
 *         description: File not found
 */
router.get('/prescriptions/:filename', verifyToken, fileController.getPrescriptionFile);

router.get('/medical-records/:filename', verifyToken, fileController.getMedicalRecordFile);

router.get('/support-tickets/:filename', verifyToken, fileController.getSupportTicketFile);

router.get('/messages/:filename', verifyToken, fileController.getMessageAttachmentFile);

module.exports = router;
