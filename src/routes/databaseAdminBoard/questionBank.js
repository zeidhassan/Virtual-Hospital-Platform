const express = require('express');
const router = express.Router();
const questionBankController = require('../../controllers/databaseAdminBoard/questionBankController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

/**
 * @swagger
 * /api/question-bank:
 *   get:
 *     summary: Get all questions
 *     tags: [QuestionBank]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of questions
 *       401:
 *         description: Unauthorized
 */
router.get('/', questionBankController.getAllQuestionBank);

/**
 * @swagger
 * /api/question-bank/{id}:
 *   get:
 *     summary: Get a question by ID
 *     tags: [QuestionBank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question found
 *       404:
 *         description: Question not found
 */
router.get('/:id', questionBankController.getQuestionBankById);

/**
 * @swagger
 * /api/question-bank:
 *   post:
 *     summary: Create a new question
 *     tags: [QuestionBank]
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
 *               - question_type
 *             properties:
 *               question_text:
 *                 type: string
 *               question_type:
 *                 type: string
 *               specialty:
 *                 type: string
 *               suggested_by:
 *                 type: integer
 *               is_approved:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Question created
 *       400:
 *         description: Invalid input
 */
router.post('/', questionBankController.createQuestionBank);

/**
 * @swagger
 * /api/question-bank/{id}:
 *   put:
 *     summary: Update a question by ID
 *     tags: [QuestionBank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Question ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question_text:
 *                 type: string
 *               question_type:
 *                 type: string
 *               specialty:
 *                 type: string
 *               suggested_by:
 *                 type: integer
 *               is_approved:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Question updated
 *       404:
 *         description: Question not found
 */
router.put('/:id', questionBankController.updateQuestionBank);

/**
 * @swagger
 * /api/question-bank/{id}:
 *   delete:
 *     summary: Delete a question by ID
 *     tags: [QuestionBank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: integer
 *         required: true
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question deleted
 *       404:
 *         description: Question not found
 */
router.delete('/:id',  questionBankController.deleteQuestionBank);

module.exports = router;