// File: src/routes/questions/questions.js

const express = require('express');
const router = express.Router();

// Import your controllers
const questionsController = require('../../controllers/questions/questionsController');

// Import any validators you use
const { validateAnswerSubmission } = require('../../validators/questionsValidation');

// Middleware to verify JWT
const verifyToken = require('../../middleware/verifyToken');

/**
 * @swagger
 * tags:
 *   name: Questions
 *   description: Public and specialty health questions for patients
 */

/**
 * @swagger
 * /api/questions/public:
 *   get:
 *     summary: Get all public or specialty questions (admin only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [public, specialty]
 *         description: Filter by question type
 *       - name: specialty
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by medical specialty
 *       - name: author
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by doctor name who suggested the question
 *       - name: approval
 *         in: query
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by approval status
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *         description: Sorting (e.g., +id or -id)
 *     responses:
 *       200:
 *         description: List of filtered questions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       question_text:
 *                         type: string
 *                       question_type:
 *                         type: string
 *                       specialty:
 *                         type: string
 *                       is_approved:
 *                         type: boolean
 *                       doctor_name:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/public',
  verifyToken,
  questionsController.getPublicQuestions
);

/**
 * @swagger
 * /api/questions/specialty/{specialty}:
 *   get:
 *     summary: Get specialty questions by specialty name
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: specialty
 *         schema:
 *           type: string
 *         required: true
 *         description: Medical specialty (e.g., cardiology)
 *     responses:
 *       200:
 *         description: A list of specialty questions
 */
router.get(
  '/specialty/:specialty',
  verifyToken,
  questionsController.getSpecialtyQuestions
);

/**
 * @swagger
 * /api/questions/response:
 *   post:
 *     summary: Submit a patient's answer to a question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - question_id
 *               - answer
 *             properties:
 *               patient_id:
 *                 type: integer
 *               question_id:
 *                 type: integer
 *               answer:
 *                 type: string
 *     responses:
 *       201:
 *         description: Answer submitted
 */
router.post(
  '/response',
  verifyToken,
  validateAnswerSubmission,
  questionsController.submitAnswer
);

/**
 * @swagger
 * /api/questions/responses/{patientId}:
 *   get:
 *     summary: Get all question responses for a patient
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the patient
 *     responses:
 *       200:
 *         description: List of answered questions for the patient
 */
router.get(
  '/responses/:patientId',
  verifyToken,
  questionsController.getResponsesByPatient
);

/**
 * @swagger
 * /api/questions/file-summary/{patientId}:
 *   get:
 *     summary: Get full question‐answer summary for a patient
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the patient
 *     responses:
 *       200:
 *         description: Full list of answered questions for the patient
 */
router.get(
  '/file-summary/:patientId',
  verifyToken,
  questionsController.getResponsesByPatient
);

/**
 * @swagger
 * /api/questions/note:
 *   post:
 *     summary: Add a doctor's note to a patient response
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctor_id
 *               - response_id
 *               - note
 *             properties:
 *               doctor_id:
 *                 type: integer
 *               response_id:
 *                 type: integer
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note added
 */
router.post(
  '/note',
  verifyToken,
  questionsController.addNoteToResponse
);

/**
 * @swagger
 * /api/questions/suggest:
 *   post:
 *     summary: Doctor suggests a specialty question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question_text
 *               - specialty
 *               - doctor_id
 *             properties:
 *               question_text:
 *                 type: string
 *               specialty:
 *                 type: string
 *               doctor_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Question suggestion submitted
 */
router.post(
  '/suggest',
  verifyToken,
  questionsController.suggestSpecialtyQuestion
);

/**
 * @swagger
 * /api/questions/submit-answers:
 *   post:
 *     summary: Submit all answers in bulk for a patient
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - answers
 *             properties:
 *               patient_id:
 *                 type: integer
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_id:
 *                       type: integer
 *                     answer:
 *                       type: string
 *     responses:
 *       201:
 *         description: Answers submitted
 */
router.post(
  '/submit-answers',
  verifyToken,
  questionsController.submitBulkAnswers
);

/**
 * @swagger
 * /api/questions/my-responses:
 *   get:
 *     summary: Get all question‐answer rows for the logged‐in patient
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of Q&A for this patient
 *       403:
 *         description: Access denied (not a patient)
 *       404:
 *         description: Patient not found
 */
router.get('/my-responses',
  verifyToken,
  questionsController.getMyResponses
);


// Export the configured router
module.exports = router;
