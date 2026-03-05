const express = require('express');
const router = express.Router();
const billsController = require('../../controllers/databaseAdminBoard/billsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/bills:
 *   get:
 *     summary: Get all bills
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all billing records
 *       401:
 *         description: Unauthorized
 */
router.get('/', billsController.getAllBills);
/**
 * @swagger
 * /api/bills/{id}:
 *   get:
 *     summary: Get a bill by ID
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill details
 *       404:
 *         description: Bill not found
 */
router.get('/:id', billsController.getBillById);
/**
 * @swagger
 * /api/bills:
 *   post:
 *     summary: Create a new bill
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - status
 *               - billing_date
 *             properties:
 *               amount:
 *                 type: number
 *               status:
 *                 type: string
 *               billing_date:
 *                 type: string
 *                 format: date
 *               details:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bill created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', billsController.createBill);
/**
 * @swagger
 * /api/bills/{id}:
 *   put:
 *     summary: Update a bill
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               status:
 *                 type: string
 *               billing_date:
 *                 type: string
 *                 format: date
 *               details:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bill updated
 *       404:
 *         description: Bill not found
 */
router.put('/:id', billsController.updateBill);
/**
 * @swagger
 * /api/bills/{id}:
 *   delete:
 *     summary: Delete a bill by ID
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill deleted
 *       404:
 *         description: Bill not found
 */
router.delete('/:id', billsController.deleteBill);

module.exports = router;
