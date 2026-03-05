const express = require('express');
const router = express.Router();
const medicationsController = require('../../controllers/databaseAdminBoard/medicationsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/medications:
 *   get:
 *     summary: Get all medications
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of medications
 *       401:
 *         description: Unauthorized
 */
router.get('/', medicationsController.getAllMedications);

/**
 * @swagger
 * /api/medications/{id}:
 *   get:
 *     summary: Get a medication by ID
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Medication ID
 *     responses:
 *       200:
 *         description: Medication found
 *       404:
 *         description: Medication not found
 */
router.get('/:id', medicationsController.getMedicationById);

/**
 * @swagger
 * /api/medications:
 *   post:
 *     summary: Create a new medication
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Medication created
 *       400:
 *         description: Invalid input
 */
router.post('/', medicationsController.createMedication);

/**
 * @swagger
 * /api/medications/{id}:
 *   put:
 *     summary: Update a medication by ID
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Medication ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Medication updated
 *       404:
 *         description: Medication not found
 */
router.put('/:id', medicationsController.updateMedication);

/**
 * @swagger
 * /api/medications/{id}:
 *   delete:
 *     summary: Delete a medication by ID
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Medication ID
 *     responses:
 *       200:
 *         description: Medication deleted
 *       404:
 *         description: Medication not found
 */
router.delete('/:id', medicationsController.deleteMedication);

module.exports = router;