const { validateDoctorPrescription } = require('../../src/validators/prescriptionsValidation');
const { validationResult } = require('express-validator');

describe('Prescription Validation', () => {
  it('should return error for missing fields', async () => {
    const req = { body: {} };

    // Mock response object with chained .status().json()
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const next = jest.fn();

    for (const middleware of validateDoctorPrescription) {
      await middleware(req, res, next);
    }

    // Assert the middleware handled the error
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: expect.any(Array) })
    );
  });

  it('should pass with valid data', async () => {
    const req = {
      body: {
        medication_id: 1,
        dosage: '500mg',
        instructions: 'Take after meals',
        issued_date: '2025-12-31'
      },
      params: { appointmentId: '123' }
    };
    const res = {};
    const next = jest.fn();

    for (const middleware of validateDoctorPrescription) {
      await middleware(req, res, next);
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBe(true);
  });
});
