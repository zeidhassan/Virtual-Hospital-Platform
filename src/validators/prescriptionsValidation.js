const { body, param, validationResult } = require('express-validator');

const validateAddPrescription = [
  param('appointmentId')
    .isInt().withMessage('Appointment ID in URL must be a number'),
  body('medication')
    .trim().notEmpty().escape().withMessage('Medication is required'),
  body('dosage')
    .trim().notEmpty().escape().withMessage('Dosage is required'),
  body('instructions')
    .trim().notEmpty().withMessage('Instructions are required'),
  body('issued_date')
    .isISO8601().withMessage('Issued date must be a valid date (YYYY-MM-DD)'),
  // Optional pack_limit
  body('pack_limit')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Pack limit must be a positive integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

module.exports = { validateAddPrescription };
