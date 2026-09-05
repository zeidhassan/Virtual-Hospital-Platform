const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const paginate = require('../../utils/pagination');
const verifyToken = require('../../middleware/verifyToken');

// Middleware to ensure only admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Admin - Question Bank
 *   description: Admin operations for managing the question bank
 */

/**
 * @swagger
 * /api/admin/questions:
 *   get:
 *     summary: Get all questions (including pending suggestions)
 *     tags: [Admin - Question Bank]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns all questions
 */
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await paginate({
      table: 'question_bank',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-created_at',
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

/**
 * @swagger
 * /api/admin/questions/{id}/approve:
 *   put:
 *     summary: Approve a suggested specialty question
 *     tags: [Admin - Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the question to approve
 *     responses:
 *       200:
 *         description: Question approved
 */
router.put('/:id/approve', verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE question_bank SET is_approved = TRUE WHERE id = $1', [req.params.id]);
    res.status(200).json({ message: 'Question approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve question' });
  }
});

/**
 * @swagger
 * /api/admin/questions/{id}:
 *   delete:
 *     summary: Delete a question from the question bank
 *     tags: [Admin - Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the question to delete
 *     responses:
 *       200:
 *         description: Question deleted
 */
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM question_bank WHERE id = $1', [req.params.id]);
    res.status(200).json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

module.exports = router;
