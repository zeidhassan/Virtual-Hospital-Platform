const express = require('express');
const router = express.Router();
const controller = require('../../controllers/PharmacyOrders/pharmacyOrderController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');

// GET all orders (admin only)
/**
 * @swagger
 * /api/pharmacy-orders:
 *   get:
 *     summary: Get all pharmacy orders (admin only)
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pharmacy orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   patient_id:
 *                     type: integer
 *                   medications:
 *                     type: string
 *                   total_amount:
 *                     type: number
 *                   status:
 *                     type: string
 *                   prescription_file:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', verifyToken, requireRole('admin'), controller.getAllOrders);

// GET patient orders
/**
 * @swagger
 * /api/pharmacy-orders/patient/{patient_id}:
 *   get:
 *     summary: Get pharmacy orders for a specific patient
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patient_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Patient order history
 */
router.get('/patient/:id', verifyToken, requireRole('patient'), controller.getOrdersByPatient);

// POST new order
/**
 * @swagger
 * /api/pharmacy-orders:
 *   post:
 *     summary: Create a new pharmacy order
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: medications
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of medication names
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               prescription_file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Missing or invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, requireRole('patient'), controller.createOrder);

// PUT update status
/**
 * @swagger
 * /api/pharmacy-orders/{orderId}:
 *   put:
 *     summary: Update the status of a pharmacy order
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_status:
 *                 type: string
 *                 example: Shipped
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:orderId', verifyToken, requireRole('admin'), controller.updateOrderStatus);

// GET medication list (all roles)
/**
 * @swagger
 * /api/pharmacy-orders/{orderId}:
 *   put:
 *     summary: Update the status of a pharmacy order
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_status:
 *                 type: string
 *                 example: Shipped
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/medications/list', verifyToken, requireRole(['patient', 'doctor', 'admin']), controller.getMedications);


module.exports = router;
