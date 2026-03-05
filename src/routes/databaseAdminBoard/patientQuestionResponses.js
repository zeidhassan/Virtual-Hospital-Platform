const express = require('express');
const router = express.Router();
const patientQuestionResponsesController = require('../../controllers/databaseAdminBoard/patientQuestionResponsesController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/patient_question_responses:
 *   get:
 *     summary: Get all patient question responses
 *     tags: [PatientQuestionResponses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of responses
 *       401:
 *         description: Unauthorized
 */
router.get('/', patientQuestionResponsesController.getAllPatientQuestionResponses);

/**
 * @swagger
 * /api/patient_question_responses/{id}:
 *   get:
 *     summary: Get a patient question response by ID
 *     tags: [PatientQuestionResponses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Response ID
 *     responses:
 *       200:
 *         description: Response found
 *       404:
 *         description: Response not found
 */
router.get('/:id', patientQuestionResponsesController.getPatientQuestionResponsesById);

/**
 * @swagger
 * /api/patient_question_responses:
 *   post:
 *     summary: Create a new patient question response
 *     tags: [PatientQuestionResponses]
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
 *         description: Response created
 *       400:
 *         description: Invalid input
 */
router.post('/', patientQuestionResponsesController.createPatientQuestionResponses);

/**
 * @swagger
 * /api/patient_question_responses/{id}:
 *   put:
 *     summary: Update a patient question response by ID
 *     tags: [PatientQuestionResponses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Response ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patient_id:
 *                 type: integer
 *               question_id:
 *                 type: integer
 *               answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response updated
 *       404:
 *         description: Response not found
 */
router.put('/:id', patientQuestionResponsesController.updatePatientQuestionResponses);

/**
 * @swagger
 * /api/patient_question_responses/{id}:
 *   delete:
 *     summary: Delete a patient question response by ID
 *     tags: [PatientQuestionResponses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Response ID
 *     responses:
 *       200:
 *         description: Response deleted
 *       404:
 *         description: Response not found
 */
router.delete('/:id', patientQuestionResponsesController.deletePatientQuestionResponses);

module.exports = router;