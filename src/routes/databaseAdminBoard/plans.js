const express = require('express');
const router = express.Router();
const plansController = require('../../controllers/databaseAdminBoard/plansController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: Get all plans
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of plans
 *       401:
 *         description: Unauthorized
 */
router.get('/', plansController.getAllPlans);

/**
 * @swagger
 * /api/plans/{id}:
 *   get:
 *     summary: Get a plan by ID
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Plan found
 *       404:
 *         description: Plan not found
 */
router.get('/:id', plansController.getPlanById);

/**
 * @swagger
 * /api/plans:
 *   post:
 *     summary: Create a new plan
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - duration_days
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               duration_days:
 *                 type: integer
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               currency:
 *                 type: string
 *     responses:
 *       201:
 *         description: Plan created
 *       400:
 *         description: Invalid input
 */
router.post('/', plansController.createPlan);

/**
 * @swagger
 * /api/plans/{id}:
 *   put:
 *     summary: Update a plan by ID
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Plan ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               duration_days:
 *                 type: integer
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plan updated
 *       404:
 *         description: Plan not found
 */
router.put('/:id', plansController.updatePlan);

/**
 * @swagger
 * /api/plans/{id}:
 *   delete:
 *     summary: Delete a plan by ID
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Plan deleted
 *       404:
 *         description: Plan not found
 */
router.delete('/:id', plansController.deletePlan);

module.exports = router;