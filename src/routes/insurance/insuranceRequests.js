// src/routes/insuranceRequests.js

const express = require('express');
const router = express.Router();
const insuranceRequestsController = require('../../controllers/insurance/insuranceRequestsController');
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
// Doctor: View their pending requests
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
// Doctor: Accept
router.post('/:id/accept', verifyToken, insuranceRequestsController.acceptInsuranceRequest);
/**
 * @swagger
 * /insurance/insurance-requests/{id}/reject:
 *   post:
 *     summary: Reject an insurance request (Doctor)
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
 *         description: Insurance request rejected
 *       400:
 *         description: Invalid request or already processed
 *       404:
 *         description: Insurance request not found
 */
// Doctor: Reject
router.post('/:id/reject', verifyToken, insuranceRequestsController.rejectInsuranceRequest);
/**
 * @swagger
 * /insurance/insurance-requests/patient/{id}:
 *   get:
 *     summary: Get all insurance requests submitted by a patient
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
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: List of insurance requests for the patient
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InsuranceRequest'
 */
// Patient: View own requests
router.get('/patient/:id', verifyToken, insuranceRequestsController.getPatientInsuranceRequests);
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
