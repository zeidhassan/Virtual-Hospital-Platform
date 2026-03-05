const express = require('express');
const router = express.Router();
const chartsController = require('../../controllers/admin/chartsController');
const requireRole = require('../../middleware/requireRole');

// All routes require admin or doctor access
const allowedRoles = ['admin', 'doctor'];

/**
 * @swagger
 * /api/admin/charts/top-doctors:
 *   get:
 *     summary: Get top doctors by appointments
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Top doctor stats
 */
router.get('/top-doctors', requireRole(allowedRoles), chartsController.getTopDoctorsByAppointments);

/**
 * @swagger
 * /api/admin/charts/top-medications:
 *   get:
 *     summary: Get top prescribed medications
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Medication stats
 */
router.get('/top-medications', requireRole(allowedRoles), chartsController.getTopMedications);

/**
 * @swagger
 * /api/admin/charts/subscription-distribution:
 *   get:
 *     summary: Get subscription distribution
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Subscription stats
 */
router.get('/subscription-distribution', requireRole(allowedRoles), chartsController.getSubscriptionDistribution);

module.exports = router;
