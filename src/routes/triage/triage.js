const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const { triageLimiter } = require('../../middleware/rateLimit');
const tc = require('../../controllers/triage/triageController');

/**
 * @swagger
 * tags:
 *   name: Triage
 *   description: AVA Triage System — symptom assessment and escalation
 */

// Validation helpers
const validateAssess = [
  body('symptoms')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Symptoms must be at least 10 characters.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

const validateRule = [
  body('urgency_level')
    .isIn(['emergency', 'urgent', 'standard', 'self_care'])
    .withMessage('urgency_level must be one of: emergency, urgent, standard, self_care'),
  body('keywords')
    .trim()
    .isLength({ min: 2 })
    .withMessage('keywords must be at least 2 characters.'),
  body('recommended_action')
    .trim()
    .notEmpty()
    .withMessage('recommended_action is required.'),
  body('recommended_department')
    .trim()
    .notEmpty()
    .withMessage('recommended_department is required.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// ─── Patient endpoints ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/triage/assess:
 *   post:
 *     summary: Submit symptoms for triage assessment
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symptoms
 *             properties:
 *               symptoms:
 *                 type: string
 *                 minLength: 10
 *                 example: "chest pain and difficulty breathing"
 *     responses:
 *       201:
 *         description: Triage assessment complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     urgency_level:
 *                       type: string
 *                       enum: [emergency, urgent, standard, self_care]
 *                     recommended_action:
 *                       type: string
 *                     recommended_department:
 *                       type: string
 *                     follow_up_recommended:
 *                       type: boolean
 *       400:
 *         description: Validation error
 *       404:
 *         description: Patient profile not found
 *       429:
 *         description: Too many triage requests
 */
router.post(
  '/assess',
  verifyToken,
  requireRole('patient'),
  triageLimiter,
  validateAssess,
  tc.assessTriage
);

/**
 * @swagger
 * /api/triage/history:
 *   get:
 *     summary: Get the current patient's triage history
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of triage sessions
 *       404:
 *         description: Patient profile not found
 */
router.get('/history', verifyToken, requireRole('patient'), tc.getTriageHistory);

/**
 * @swagger
 * /api/triage/session/{id}:
 *   get:
 *     summary: Get a specific triage session (own sessions only)
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Triage session details
 *       403:
 *         description: Access denied — not your session
 *       404:
 *         description: Session or patient not found
 */
router.get('/session/:id', verifyToken, requireRole('patient'), tc.getTriageSession);

// ─── Doctor endpoints ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/triage/escalated:
 *   get:
 *     summary: Get triage sessions escalated to the current doctor
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of escalated sessions
 *       404:
 *         description: Doctor profile not found
 */
router.get('/escalated', verifyToken, requireRole('doctor'), tc.getEscalatedSessions);

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/triage/session/{id}/escalate:
 *   put:
 *     summary: Escalate a triage session to a doctor (admin only)
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctor_id
 *             properties:
 *               doctor_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Session escalated
 *       400:
 *         description: Invalid doctor_id
 *       404:
 *         description: Session or doctor not found
 */
router.put('/session/:id/escalate', verifyToken, requireRole('admin'), tc.escalateSession);

/**
 * @swagger
 * /api/triage/admin/sessions:
 *   get:
 *     summary: Get all triage sessions with optional filters (admin only)
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: urgency_level
 *         schema:
 *           type: string
 *           enum: [emergency, urgent, standard, self_care]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Filtered list of triage sessions
 */
router.get('/admin/sessions', verifyToken, requireRole('admin'), tc.getAdminSessions);

/**
 * @swagger
 * /api/triage/rules:
 *   get:
 *     summary: Get all symptom classification rules (admin only)
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of triage rules
 */
router.get('/rules', verifyToken, requireRole('admin'), tc.getRules);

/**
 * @swagger
 * /api/triage/rules:
 *   post:
 *     summary: Create a symptom classification rule (admin only)
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urgency_level
 *               - keywords
 *               - recommended_action
 *               - recommended_department
 *             properties:
 *               urgency_level:
 *                 type: string
 *                 enum: [emergency, urgent, standard, self_care]
 *               keywords:
 *                 type: string
 *                 description: Comma-separated keywords
 *               recommended_action:
 *                 type: string
 *               recommended_department:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rule created
 *       400:
 *         description: Validation error
 */
router.post('/rules', verifyToken, requireRole('admin'), validateRule, tc.createRule);

/**
 * @swagger
 * /api/triage/rules/{id}:
 *   put:
 *     summary: Update a symptom classification rule (admin only)
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               urgency_level:
 *                 type: string
 *               keywords:
 *                 type: string
 *               recommended_action:
 *                 type: string
 *               recommended_department:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rule updated
 *       404:
 *         description: Rule not found
 */
router.put('/rules/:id', verifyToken, requireRole('admin'), tc.updateRule);

/**
 * @swagger
 * /api/triage/rules/{id}:
 *   delete:
 *     summary: Delete a symptom classification rule (admin only)
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rule deleted
 *       404:
 *         description: Rule not found
 */
router.delete('/rules/:id', verifyToken, requireRole('admin'), tc.deleteRule);

module.exports = router;
