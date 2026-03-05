const { validateCreateAppointment } = require('../../src/validators/appointmentsValidation');
const { validationResult } = require('express-validator');

describe('Appointment Validation', () => {
  it('should return error for missing fields', async () => {
    const req = { body: {} };

    // Mock the response object with chainable functions
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const next = jest.fn();

    for (const middleware of validateCreateAppointment) {
      await middleware(req, res, next);
    }

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: expect.any(Array)
    }));
  });

  it('should pass with valid data', async () => {
    const req = {
      body: {
        doctor_id: 1,
        patient_id: 2,
        appointment_date: '2025-12-31',
        appointment_start_time: '09:00',
        appointment_end_time: '10:00',
        status: 'pending',
        notes: 'Regular checkup'
      }
    };

    const res = {};
    const next = jest.fn();

    for (const middleware of validateCreateAppointment) {
      await middleware(req, res, next);
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBe(true);
  });
});
