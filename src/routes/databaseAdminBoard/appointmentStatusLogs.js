const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/appointmentStatusLogsController');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');

router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * tags:
 *   - name: Appointment Status Logs
 *     description: Admin operations on appointment status logs
 */

/**
 * @swagger
 * /api/adminBoard/appointment-status-logs:
 *   get:
 *     summary: Get all status logs
 *     tags: [Appointment Status Logs]
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/adminBoard/appointment-status-logs/{id}:
 *   get:
 *     summary: Get a status log by ID
 *     tags: [Appointment Status Logs]
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/adminBoard/appointment-status-logs:
 *   post:
 *     summary: Create a new status log
 *     tags: [Appointment Status Logs]
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/adminBoard/appointment-status-logs/{id}:
 *   put:
 *     summary: Update a status log
 *     tags: [Appointment Status Logs]
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/adminBoard/appointment-status-logs/{id}:
 *   delete:
 *     summary: Delete a status log
 *     tags: [Appointment Status Logs]
 */
router.delete('/:id', controller.remove);

module.exports = router;
