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

  describe('/api/admin/appointments generic endpoints reject follow-up rows', () => {
    let followUpId, otherDoctorId;

    beforeAll(async () => {
      const dRow = await pool.query(
        "SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id WHERE u.email = 'palmer@helixacare.com'"
      );
      otherDoctorId = dRow.rows[0]?.id;

      const future = new Date();
      future.setDate(future.getDate() + 45);
      const res = await request(app)
        .post('/api/follow-ups')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patient_id: 1,
          scheduled_date: future.toISOString().split('T')[0],
          notes: 'admin guard-test follow-up',
        });
      followUpId = res.body.id;
    });

    afterAll(async () => {
      if (followUpId) await pool.query('DELETE FROM appointments WHERE id = $1', [followUpId]);
    });

    it('PATCH /:id on a follow-up returns 400 pointing to the Follow-Ups page', async () => {
      const res = await request(app)
        .patch(`/api/admin/appointments/${followUpId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Follow-Ups page/);
    });

    it('PUT /:id/reassign on a follow-up returns 400 pointing to the Follow-Ups page', async () => {
      const res = await request(app)
        .put(`/api/admin/appointments/${followUpId}/reassign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ doctor_id: otherDoctorId });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Follow-Ups page/);
    });
  });
});
