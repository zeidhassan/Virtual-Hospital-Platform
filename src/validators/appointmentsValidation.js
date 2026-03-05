const { body, validationResult } = require('express-validator');

const validateCreateAppointment = [
  body('doctor_id').isInt().withMessage('Doctor ID must be a number'),
  body('patient_id').isInt().withMessage('Patient ID must be a number'),
  body('appointment_date').isISO8601().withMessage('Invalid appointment date'),
  body('appointment_start_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid start time format'),
  body('appointment_end_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid end time format'),
  body('status').optional().isString().trim().escape(),
  body('notes').optional().trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

const validateUpdateAppointment = [...validateCreateAppointment];

module.exports = {
  validateCreateAppointment,
  validateUpdateAppointment
};
