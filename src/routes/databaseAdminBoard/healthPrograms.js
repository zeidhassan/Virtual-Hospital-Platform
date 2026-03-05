const express = require('express');
const router = express.Router();
const programsController = require('../../controllers/databaseAdminBoard/healthProgramsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken')
router.use(verifyToken);
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/programs:
 *   get:
 *     summary: Get all health programs
 *     tags: [Health Programs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of health programs
 *       401:
 *         description: Unauthorized
 */
router.get('/', programsController.getAllPrograms);
/**
 * @swagger
 * /api/programs/{id}:
 *   get:
 *     summary: Get a health program by ID
 *     tags: [Health Programs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *     responses:
 *       200:
 *         description: Health program details
 *       404:
 *         description: Program not found
 */
router.get('/:id', programsController.getProgramById);
/**
 * @swagger
 * /api/programs:
 *   post:
 *     summary: Create a new health program
 *     tags: [Health Programs]
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
 *               - description
 *               - start_date
 *               - end_date
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               eligibility:
 *                 type: string
 *     responses:
 *       201:
 *         description: Program created
 *       400:
 *         description: Invalid input
 */
router.post('/', programsController.createProgram);
/**
 * @swagger
 * /api/programs/{id}:
 *   put:
 *     summary: Update a health program
 *     tags: [Health Programs]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               eligibility:
 *                 type: string
 *     responses:
 *       200:
 *         description: Program updated
 *       404:
 *         description: Program not found
 */
router.put('/:id', programsController.updateProgram);
/**
 * @swagger
 * /api/programs/{id}:
 *   delete:
 *     summary: Delete a health program
 *     tags: [Health Programs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *     responses:
 *       200:
 *         description: Program deleted
 *       404:
 *         description: Program not found
 */
router.delete('/:id', programsController.deleteProgram);

module.exports = router;
