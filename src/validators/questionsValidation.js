const { body } = require('express-validator');

exports.validateAnswerSubmission = [
  body('patient_id').isInt().withMessage('Valid patient_id is required'),
  body('question_id').isInt().withMessage('Valid question_id is required'),
  body('answer').trim().notEmpty().withMessage('Answer cannot be empty')
];
