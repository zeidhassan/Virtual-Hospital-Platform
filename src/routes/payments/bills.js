const express = require('express');
const router = express.Router();
const { createBill, getBillsByPatient, updateBillStatus, deleteBill } = require('../../controllers/payments/billsController');

const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);

// Create a bill (Admin or Doctor only)
/**
 * @swagger
 * /api/payments/bills:
 *   post:
 *     summary: Create a new bill
 *     tags: [Bills]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patient_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               details:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bill created successfully
 *       403:
 *         description: Access denied
 */
router.post('/', requireRole(['doctor', 'admin']), createBill);

// View bills for a patient (anyone; access check inside controller)
/**
 * @swagger
 * /api/payments/bills/patient/{id}:
 *   get:
 *     summary: Get all bills for a specific patient
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: List of bills
 *       403:
 *         description: Access denied
 */
router.get('/patient/:id', getBillsByPatient);

// Update bill status (Admin or Doctor)
/**
 * @swagger
 * /api/payments/bills/{id}:
 *   put:
 *     summary: Update bill status
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "paid"
 *     responses:
 *       200:
 *         description: Bill updated
 *       403:
 *         description: Access denied
 */
router.put('/:id', requireRole(['doctor', 'admin']), updateBillStatus);

// Delete a bill (Admin only)
/**
 * @swagger
 * /api/payments/bills/{id}:
 *   delete:
 *     summary: Delete a bill
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill deleted
 *       403:
 *         description: Access denied
 */
router.delete('/:id', requireRole('admin'), deleteBill);

module.exports = router;
