const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Appointments Integration Tests', () => {
  let token;
  let createdId;

  beforeAll(async () => {
    // Login as an admin (make sure this user exists in test DB and has role 'admin')
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@helixacare.com',
      password: 'admin123'
    });
    token = res.body.token;

    // Defensive: clear any row left behind by a previous run that didn't
    // reach afterAll (crash, interrupted run) — this test always books the
    // same doctor/date/time, so a leftover row would collide.
    await pool.query(
      "DELETE FROM appointments WHERE notes = 'Test note' AND appointment_date = '2025-12-15'"
    );
  });

  afterAll(async () => {
    if (createdId) {
      await pool.query('DELETE FROM appointments WHERE id = $1', [createdId]);
    }
  });

  it('should create a new appointment', async () => {
    const res = await request(app)
      .post('/api/adminBoard/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patient_id: 1,
        doctor_id: 1,
        appointment_date: '2025-12-15',
        appointment_start_time: '10:00',
        appointment_end_time: '10:30',
        status: 'confirmed',
        notes: 'Test note'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id'); // Ensure the created appointment has an ID
    createdId = res.body.id;
  });
});
