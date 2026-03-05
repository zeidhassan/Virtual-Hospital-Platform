const request = require('supertest');
const app = require('../../src/app');
const path = require('path');

describe('Prescriptions Integration Tests', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'strange@virtualhospitalplatform.com',
      password: 'doctor123'
    });
    token = res.body.token;
  });

  it('should allow a doctor to upload a prescription with a file', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${token}`)
      .field('appointment_id', '1')
      .field('medication', 'Ibuprofen')
      .field('dosage', '200mg')
      .field('instructions', 'Take one every 8 hours')
      .field('issued_date', '2025-12-01')
      .attach('file', path.join(__dirname, '../__mocks__/testfile.pdf')); // Required valid file

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'Prescription added');
    expect(res.body).toHaveProperty('data');
  });
});
