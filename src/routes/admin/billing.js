const express = require('express');
const router = express.Router();
const billingController = require('../../controllers/admin/billingController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);

/**
 * @swagger
 * /api/admin/billing:
 *   get:
 *     summary: Get filtered billing records
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Filtered billing list
 */
router.get('/', requireRole('admin'), billingController.getFilteredBills);

/**
 * @swagger
 * /api/admin/billing/export/csv:
 *   get:
 *     summary: Export billing data as CSV
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: CSV file exported
 */
router.get('/export/csv', requireRole('admin'), billingController.exportBillsCSV);

/**
 * @swagger
 * /api/admin/billing/export/pdf:
 *   get:
 *     summary: Export billing data as PDF
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: PDF file exported
 */
router.get('/export/pdf', requireRole('admin'), billingController.exportBillsPDF);

module.exports = router;
