// src/routes/insuranceRequests.js

const express = require('express');
const router = express.Router();
const insuranceRequestsController = require('../../controllers/insurance/insuranceRequestsController');
const patientInsuranceController = require('../../controllers/insurance/patientInsuranceController');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
/**
 * @swagger
 * /insurance/insurance-requests/doctor/{id}:
 *   get:
 *     summary: Get all pending insurance requests assigned to the doctor
 *     tags:
 *       - Insurance - Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: List of pending requests for the doctor
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InsuranceRequest'
 */
/**
 * @swagger
 * /api/insurance-requests:
 *   post:
 *     summary: Patient submits a new insurance request
 *     tags:
 *       - Insurance - Requests
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - insurance_company
 *               - insurance_id_number
 *               - start_date
 *               - end_date
 *             properties:
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
 *               doctor_id:
 *                 type: integer
 *               bill_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Insurance request submitted
 *       400:
 *         description: Missing required fields
 */
// Patient: manage persistent active insurance policy (static routes before /:id)
router.get('/policy', verifyToken, requireRole('patient'), patientInsuranceController.getMyPolicy);
router.post('/policy', verifyToken, requireRole('patient'), patientInsuranceController.saveMyPolicy);
router.delete('/policy', verifyToken, requireRole('patient'), patientInsuranceController.cancelMyPolicy);

// Patient: Submit new request
router.post('/', verifyToken, requireRole('patient'), insuranceRequestsController.submitInsuranceRequest);

/**
 * @swagger
 * /api/insurance-requests/my:
 *   get:
 *     summary: Get own insurance requests (patient, by token)
 *     tags:
 *       - Insurance - Requests
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of patient's own insurance requests
 */
// Patient: Get own requests by token
router.get('/my', verifyToken, requireRole('patient'), insuranceRequestsController.getMyInsuranceRequests);

// Patient: Check for active (accepted) insurance coverage
router.get('/active', verifyToken, requireRole('patient'), insuranceRequestsController.getActiveInsurance);

// Doctor: View their pending requests (token-based, no ID param needed)
router.get('/doctor-pending', verifyToken, requireRole('doctor'), insuranceRequestsController.getDoctorInsuranceRequests);

// Doctor: View their pending requests (legacy route with path param — controller uses token, not the param)
router.get('/doctor/:id', verifyToken, insuranceRequestsController.getDoctorInsuranceRequests);
/**
 * @swagger
 * /insurance/insurance-requests/{id}/accept:
 *   post:
 *     summary: Accept an insurance request (Doctor)
 *     tags:
 *       - Insurance - Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Insurance Request ID
 *     responses:
 *       200:
 *         description: Insurance request accepted
 *       400:
 *         description: Invalid request or already processed
 *       404:
 *         description: Insurance request not found
 */
// Doctor or Admin: Accept
router.post('/:id/accept', verifyToken, requireRole(['doctor', 'admin']), insuranceRequestsController.acceptInsuranceRequest);
// Doctor or Admin: Reject
router.post('/:id/reject', verifyToken, requireRole(['doctor', 'admin']), insuranceRequestsController.rejectInsuranceRequest);
// A patient views their own requests via GET /my above — the old
// GET /patient/:id (unused by the frontend, and unauthenticated against
// which patient it was reading) has been removed.
/**
 * @swagger
 * /insurance/insurance-requests:
 *   get:
 *     summary: Admin - Get all insurance requests
 *     tags:
 *       - Insurance - Requests
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All insurance requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InsuranceRequest'
 */
// Admin: View all requests
router.get('/', verifyToken, requireRole('admin'), insuranceRequestsController.getAllInsuranceRequests);

module.exports = router;
