const express = require('express');
const router = express.Router();
const controller = require('../../controllers/medications/medicationsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
/**
 * @swagger
 * /medications/countertop:
 *   get:
 *     summary: Get all countertop medications
 *     tags:
 *       - Medications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of countertop medications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Medication'
 */
router.get('/countertop', verifyToken, controller.getCountertopMedications);
/**
 * @swagger
 * /medications/prescription:
 *   get:
 *     summary: Get all prescription medications
 *     tags:
 *       - Medications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of prescription medications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Medication'
 */
router.get('/prescription', verifyToken, controller.getPrescriptionMedications);

module.exports = router;