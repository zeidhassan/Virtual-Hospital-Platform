const request = require('supertest');
const app = require('../../src/app');

describe('Appointments Integration Tests', () => {
  let token;

  beforeAll(async () => {
    // Login as an admin (make sure this user exists in test DB and has role 'admin')
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@virtualhospitalplatform.com',
      password: 'admin123'
    });
    token = res.body.token;
  });

  it('should create a new appointment', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patient_id: 1,
        doctor_id: 1,
        appointment_date: '2025-12-15',
        appointment_start_time: '10:00',
        appointment_end_time: '10:30',
        status: 'scheduled',
        notes: 'Test note'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id'); // Ensure the created appointment has an ID
  });
});
