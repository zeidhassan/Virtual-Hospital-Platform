// src/routes/admin/adminInsurance.js

const express = require('express');
const router = express.Router();
const adminInsuranceController = require('../../controllers/admin/adminInsuranceController');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');

// Protect all with admin role
router.use(verifyToken);
router.use(requireRole('admin'));
/**
 * @swagger
 * /admin/insurance/stats:
 *   get:
 *     summary: Get insurance usage statistics (accepted vs rejected)
 *     tags:
 *       - Admin - Insurance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insurance stats returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accepted:
 *                   type: integer
 *                 rejected:
 *                   type: integer
 */
// 1) Stats: accepted vs rejected
router.get('/stats', adminInsuranceController.getInsuranceUsageStats);
/**
 * @swagger
 * /admin/insurance/bills:
 *   get:
 *     summary: Get insurance bills filtered by payment type
 *     tags:
 *       - Admin - Insurance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: paymentType
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by payment type (e.g. cash, insurance, etc.)
 *     responses:
 *       200:
 *         description: List of insurance bills
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bill'
 */
// 2) Filter bills by payment type
router.get('/bills', adminInsuranceController.getBillsByPaymentType);
/**
 * @swagger
 * /admin/insurance/export:
 *   get:
 *     summary: Export all insurance transactions as CSV/Excel
 *     tags:
 *       - Admin - Insurance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File exported successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
// 3) Export insurance transactions
router.get('/export', adminInsuranceController.exportInsuranceTransactions);

module.exports = router;
