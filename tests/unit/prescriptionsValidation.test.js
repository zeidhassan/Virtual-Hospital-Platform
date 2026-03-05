const { validateAddPrescription } = require('../../src/validators/prescriptionsValidation');
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

    for (const middleware of validateAddPrescription) {
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
        appointment_id: 123,
        medication: 'Paracetamol',
        dosage: '500mg',
        instructions: 'Take after meals',
        issued_date: '2025-12-31'
      }
    };
    const res = {};
    const next = jest.fn();

    for (const middleware of validateAddPrescription) {
      await middleware(req, res, next);
    }

    const errors = validationResult(req);
    expect(errors.isEmpty()).toBe(true);
  });
});
