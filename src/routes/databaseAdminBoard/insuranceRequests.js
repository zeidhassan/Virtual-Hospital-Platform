const express = require('express');
const router = express.Router();
const insuranceRequestsController = require('../../controllers/databaseAdminBoard/insuranceRequestsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/insurance_requests:
 *   get:
 *     summary: Get all insurance requests
 *     tags: [InsuranceRequests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of insurance requests
 *       401:
 *         description: Unauthorized
 */
router.get('/', insuranceRequestsController.getAllInsuranceRequests);

/**
 * @swagger
 * /api/insurance_requests/{id}:
 *   get:
 *     summary: Get an insurance request by ID
 *     tags: [InsuranceRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Insurance request ID
 *     responses:
 *       200:
 *         description: Insurance request found
 *       404:
 *         description: Insurance request not found
 */
router.get('/:id', insuranceRequestsController.getInsuranceRequestsById);

/**
 * @swagger
 * /api/insurance_requests:
 *   post:
 *     summary: Create a new insurance request
 *     tags: [InsuranceRequests]
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
 *               - doctor_id
 *               - bill_id
 *               - insurance_company
 *               - insurance_id_number
 *             properties:
 *               patient_id:
 *                 type: integer
 *               doctor_id:
 *                 type: integer
 *               bill_id:
 *                 type: integer
 *               insurance_company:
 *                 type: string
 *               insurance_id_number:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Insurance request created
 *       400:
 *         description: Invalid input
 */
router.post('/', insuranceRequestsController.createInsuranceRequests);

/**
 * @swagger
 * /api/insurance_requests/{id}:
 *   put:
 *     summary: Update an insurance request by ID
 *     tags: [InsuranceRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Insurance request ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patient_id:
 *                 type: integer
 *               doctor_id:
 *                 type: integer
 *               bill_id:
 *                 type: integer
 *               insurance_company:
 *                 type: string
 *               insurance_id_number:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Insurance request updated
 *       404:
 *         description: Insurance request not found
 */
router.put('/:id', insuranceRequestsController.updateInsuranceRequests);

/**
 * @swagger
 * /api/insurance_requests/{id}:
 *   delete:
 *     summary: Delete an insurance request by ID
 *     tags: [InsuranceRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Insurance request ID
 *     responses:
 *       200:
 *         description: Insurance request deleted
 *       404:
 *         description: Insurance request not found
 */
router.delete('/:id', insuranceRequestsController.deleteInsuranceRequests);

module.exports = router;