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

// Deliberately its own list, not spread from validateCreateAppointment —
// this route only ever receives { status, outcome_notes }, not the full
// appointment shape. outcome_notes must NOT use .escape() the way the
// generic `notes` field above does: that HTML-entity-encodes apostrophes
// (patient's -> patient&#x27;s), which is fine for form input but wrong for
// clinical text meant to be read back; React already escapes on render.
const validateUpdateAppointmentStatus = [
  body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled', 'missed']).withMessage('Invalid status value'),
  body('outcome_notes').optional({ nullable: true }).isString().isLength({ max: 5000 }).withMessage('Outcome notes too long'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Every frontend caller reads err.response.data.error — the sibling
      // validators above only return { errors: [...] }, which would surface
      // here as a blank/generic toast.
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateCreateAppointment,
  validateUpdateAppointment,
  validateUpdateAppointmentStatus
};
