const express = require('express');
const router = express.Router();
const controller = require('../../controllers/PharmacyOrders/pharmacyOrderController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
const { uploadPrescription, wrapUpload } = require('../../middleware/uploadMiddleware');

/**
 * @swagger
 * /api/pharmacy-orders/medications/list:
 *   get:
 *     summary: Get medications catalog (all authenticated roles)
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [countertop, prescription] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *     responses:
 *       200:
 *         description: Paginated medications list
 */
router.get('/medications/list', verifyToken, controller.getMedications);

/**
 * @swagger
 * /api/pharmacy-orders/my:
 *   get:
 *     summary: Get authenticated patient's own orders
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated order list
 */
router.get('/my', verifyToken, requireRole('patient'), controller.getMyOrders);

/**
 * @swagger
 * /api/pharmacy-orders:
 *   get:
 *     summary: Get all pharmacy orders (admin/doctor)
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated orders
 */
router.get('/', verifyToken, requireRole(['admin', 'doctor']), controller.getAllOrders);

/**
 * @swagger
 * /api/pharmacy-orders:
 *   post:
 *     summary: Place a pharmacy order (patient)
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: medications
 *         required: true
 *         schema: { type: string }
 *         description: Comma-separated medication names
 *       - in: query
 *         name: quantities
 *         schema: { type: string }
 *         description: Comma-separated quantities (matches medication order)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [delivery_address]
 *             properties:
 *               delivery_address: { type: string }
 *               payment_method: { type: string, enum: [cash, card, insurance] }
 *               prescription_file: { type: string, format: binary }
 *               prescription_id: { type: integer }
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Validation error
 */
router.post('/', verifyToken, requireRole('patient'), wrapUpload(uploadPrescription, 'prescription_file'), controller.createOrder);

/**
 * @swagger
 * /api/pharmacy-orders/{orderId}/cancel:
 *   put:
 *     summary: Cancel a pending order (patient)
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order cancelled
 *       400:
 *         description: Order is not pending
 *       403:
 *         description: Not your order
 */
router.put('/:orderId/cancel', verifyToken, requireRole('patient'), controller.cancelOrder);

/**
 * @swagger
 * /api/pharmacy-orders/{orderId}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order details
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 */
router.get('/:orderId', verifyToken, controller.getOrderById);

/**
 * @swagger
 * /api/pharmacy-orders/{orderId}:
 *   put:
 *     summary: Update order status (admin/doctor)
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_status]
 *             properties:
 *               new_status:
 *                 type: string
 *                 enum: [pending, processing, dispatched, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Order not found
 */
router.put('/:orderId', verifyToken, requireRole(['admin', 'doctor']), controller.updateOrderStatus);

module.exports = router;
