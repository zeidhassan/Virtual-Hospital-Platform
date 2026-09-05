const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/questionAssignmentsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllQuestionAssignments);
router.get('/:id', controller.getQuestionAssignmentById);
router.post('/', controller.createQuestionAssignment);
router.put('/:id', controller.updateQuestionAssignment);
router.delete('/:id', controller.deleteQuestionAssignment);

module.exports = router;
