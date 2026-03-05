const express = require('express');
const router = express.Router();
const pharmacyOrdersController = require('../../controllers/databaseAdminBoard/pharmacyOrdersController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/pharmacy-orders:
 *   get:
 *     summary: Get all pharmacy orders
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pharmacy orders
 *       401:
 *         description: Unauthorized
 */
router.get('/', pharmacyOrdersController.getAllPharmacyOrders);
/**
 * @swagger
 * /api/pharmacy-orders/{id}:
 *   get:
 *     summary: Get a pharmacy order by ID
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pharmacy order ID
 *     responses:
 *       200:
 *         description: Order data
 *       404:
 *         description: Order not found
 */
router.get('/:id', pharmacyOrdersController.getPharmacyOrderById);
/**
 * @swagger
 * /api/pharmacy-orders:
 *   post:
 *     summary: Create a new pharmacy order
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medications
 *               - total_amount
 *               - status
 *             properties:
 *               medications:
 *                 type: string
 *               total_amount:
 *                 type: number
 *               status:
 *                 type: string
 *               ordered_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Pharmacy order created
 *       400:
 *         description: Invalid input
 */
router.post('/', pharmacyOrdersController.createPharmacyOrder);
/**
 * @swagger
 * /api/pharmacy-orders/{id}:
 *   put:
 *     summary: Update a pharmacy order
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pharmacy order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               medications:
 *                 type: string
 *               total_amount:
 *                 type: number
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated
 *       404:
 *         description: Order not found
 */
router.put('/:id', pharmacyOrdersController.updatePharmacyOrder);
/**
 * @swagger
 * /api/pharmacy-orders/{id}:
 *   delete:
 *     summary: Delete a pharmacy order
 *     tags: [Pharmacy Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pharmacy order ID
 *     responses:
 *       200:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 */
router.delete('/:id', pharmacyOrdersController.deletePharmacyOrder);

module.exports = router;
