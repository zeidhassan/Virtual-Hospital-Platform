const { body } = require('express-validator');

exports.validateAnswerSubmission = [
  body('question_id').isInt().withMessage('Valid question_id is required'),
  body('answer').trim().notEmpty().withMessage('Answer cannot be empty')
];
