const express = require('express');
const router = express.Router();
const prescriptionsController = require('../../controllers/databaseAdminBoard/prescriptionsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/prescriptions:
 *   get:
 *     summary: Get all prescriptions
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of prescriptions
 *       401:
 *         description: Unauthorized
 */
router.get('/', prescriptionsController.getAllPrescriptions);
/**
 * @swagger
 * /api/prescriptions/{id}:
 *   get:
 *     summary: Get a prescription by ID
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prescription ID
 *     responses:
 *       200:
 *         description: Prescription details
 *       404:
 *         description: Prescription not found
 */
router.get('/:id', prescriptionsController.getPrescriptionById);
/**
 * @swagger
 * /api/prescriptions:
 *   post:
 *     summary: Create a new prescription
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointment_id
 *               - medication
 *               - dosage
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
 *     responses:
 *       201:
 *         description: Prescription created
 *       400:
 *         description: Invalid input
 */
router.post('/', prescriptionsController.createPrescription);
/**
 * @swagger
 * /api/prescriptions/{id}:
 *   put:
 *     summary: Update a prescription
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               medication:
 *                 type: string
 *               dosage:
 *                 type: string
 *               instructions:
 *                 type: string
 *               issued_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Prescription updated
 *       404:
 *         description: Prescription not found
 */
router.put('/:id', prescriptionsController.updatePrescription);
/**
 * @swagger
 * /api/prescriptions/{id}:
 *   delete:
 *     summary: Delete a prescription
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Prescription ID
 *     responses:
 *       200:
 *         description: Prescription deleted
 *       404:
 *         description: Prescription not found
 */
router.delete('/:id', prescriptionsController.deletePrescription);

module.exports = router;
