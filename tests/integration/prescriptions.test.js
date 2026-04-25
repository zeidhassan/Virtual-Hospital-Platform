const request = require('supertest');
const app = require('../../src/app');

describe('Prescriptions Integration Tests', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'strange@helixacare.com',
      password: 'doctor123'
    });
    token = res.body.token;
  });

  it('should allow a doctor to add a prescription for a completed appointment', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        appointment_id: 9,
        medication: 'Ibuprofen',
        dosage: '200mg',
        instructions: 'Take one every 8 hours',
        issued_date: '2025-12-01'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'Prescription added');
    expect(res.body).toHaveProperty('data');
  });
});
