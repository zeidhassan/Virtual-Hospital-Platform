const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Follow-Up API (Section 7.1–7.8)', () => {
  let adminToken, doctorToken, patientToken;
  let patientId, doctorId, followUpId;

  beforeAll(async () => {
    // Login tokens
    const [adminRes, doctorRes, patientRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'admin123' }),
    ]);
    adminToken  = adminRes.body.token;
    doctorToken = doctorRes.body.token;
    patientToken = patientRes.body.token;

    // Get patient and doctor IDs from DB
    const pRow = await pool.query("SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'jane@helixacare.com'");
    const dRow = await pool.query("SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id WHERE u.email = 'strange@helixacare.com'");
    patientId = pRow.rows[0]?.id;
    doctorId  = dRow.rows[0]?.id;
  });

  afterAll(async () => {
    // Follow-ups are appointments with appointment_type = 'follow_up' (the
    // old follow_up_schedules table this used to clean up was dropped —
    // nothing writes to it any more). Clear dependents first — appointments
    // has no ON DELETE CASCADE from prescriptions/medical_records/status logs.
    const ids = await pool.query(
      "SELECT id FROM appointments WHERE appointment_type = 'follow_up' AND notes LIKE $1",
      ['%test follow-up%']
    );
    const appointmentIds = ids.rows.map((r) => r.id);
    if (appointmentIds.length > 0) {
      await pool.query('DELETE FROM prescriptions WHERE appointment_id = ANY($1)', [appointmentIds]);
      await pool.query('DELETE FROM medical_records WHERE appointment_id = ANY($1)', [appointmentIds]);
      await pool.query('DELETE FROM appointment_status_logs WHERE appointment_id = ANY($1)', [appointmentIds]);
      await pool.query('DELETE FROM appointments WHERE id = ANY($1)', [appointmentIds]);
    }
  });

  // 7.1 — Doctor creates follow-up
  it('7.1 doctor can create a follow-up', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const res = await request(app)
      .post('/api/follow-ups')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patient_id: patientId,
        doctor_id: doctorId,
        scheduled_date: tomorrow.toISOString().split('T')[0],
        notes: 'Integration test follow-up',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('pending');
    followUpId = res.body.id;
  });

  it('7.1 missing required fields returns 400', async () => {
    const res = await request(app)
      .post('/api/follow-ups')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ notes: 'missing patient_id and date' });
    expect(res.statusCode).toBe(400);
  });

  it('7.1 patient cannot create follow-up (403)', async () => {
    const res = await request(app)
      .post('/api/follow-ups')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ patient_id: patientId, scheduled_date: '2026-05-01' });
    expect(res.statusCode).toBe(403);
  });

  // 7.2 — Patient views own
  it('7.2 patient can view own follow-ups', async () => {
    const res = await request(app)
      .get('/api/follow-ups/my')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 7.3 — Doctor views assigned
  it('7.3 doctor can view assigned follow-ups', async () => {
    const res = await request(app)
      .get('/api/follow-ups/doctor')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 7.4 — Patient marks complete
  it('7.4 patient can mark their follow-up as completed', async () => {
    const res = await request(app)
      .put(`/api/follow-ups/${followUpId}/complete`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  // Create a new pending follow-up for cancel test
  let cancelId;
  it('setup — create second follow-up for cancel test', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const res = await request(app)
      .post('/api/follow-ups')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patient_id: patientId,
        doctor_id: doctorId,
        scheduled_date: future.toISOString().split('T')[0],
        notes: 'second test follow-up for cancel',
      });
    cancelId = res.body.id;
    expect(res.statusCode).toBe(201);
  });

  // 7.5 — Doctor cancels
  it('7.5 doctor can cancel a follow-up', async () => {
    const res = await request(app)
      .put(`/api/follow-ups/${cancelId}/cancel`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  // 7.6 — Admin views all
  it('7.6 admin can view all follow-ups', async () => {
    const res = await request(app)
      .get('/api/follow-ups/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('7.6 admin can filter by status', async () => {
    const res = await request(app)
      .get('/api/follow-ups/admin?status=cancelled')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((fu) => expect(fu.status).toBe('cancelled'));
  });

  // 7.7 — Process reminders
  it('7.7 admin can process reminders (returns count)', async () => {
    const res = await request(app)
      .post('/api/follow-ups/process-reminders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(typeof res.body.count).toBe('number');
  });

  // 7.8 — Process missed
  it('7.8 admin can process missed follow-ups', async () => {
    const res = await request(app)
      .post('/api/follow-ups/process-missed')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('count');
  });

  // 7.9 — Admin assigns doctor to follow-up
  let unassignedFollowUpId;
  it('setup — admin creates unassigned follow-up', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const res = await request(app)
      .post('/api/follow-ups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patient_id: patientId,
        scheduled_date: future.toISOString().split('T')[0],
        notes: 'test follow-up for assignment',
      });
    unassignedFollowUpId = res.body.id;
    expect(res.statusCode).toBe(201);
    expect(res.body.doctor_id).toBeNull();
  });

  it('7.9 admin can assign doctor to follow-up', async () => {
    const res = await request(app)
      .put(`/api/follow-ups/${unassignedFollowUpId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctor_id: doctorId });
    expect(res.statusCode).toBe(200);
    expect(res.body.doctor_id).toBe(doctorId);
  });

  it('7.9 assign without doctor_id returns 400', async () => {
    const res = await request(app)
      .put(`/api/follow-ups/${unassignedFollowUpId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('7.9 assign with invalid doctor_id returns 404', async () => {
    const res = await request(app)
      .put(`/api/follow-ups/${unassignedFollowUpId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctor_id: 99999 });
    expect(res.statusCode).toBe(404);
  });

  it('7.9 doctor cannot assign follow-ups (403)', async () => {
    const res = await request(app)
      .put(`/api/follow-ups/${unassignedFollowUpId}/assign`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ doctor_id: doctorId });
    expect(res.statusCode).toBe(403);
  });

  // 7.10 — Reschedule follow-up
  let rescheduleFollowUpId;
  it('setup — create follow-up for reschedule test', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const res = await request(app)
      .post('/api/follow-ups')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patient_id: patientId,
        scheduled_date: future.toISOString().split('T')[0],
        notes: 'test follow-up for reschedule',
      });
    rescheduleFollowUpId = res.body.id;
    expect(res.statusCode).toBe(201);
  });

  it('7.10 doctor can reschedule their follow-up', async () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 15);
    const dateString = newDate.toISOString().split('T')[0];
    const res = await request(app)
      .put(`/api/follow-ups/${rescheduleFollowUpId}/reschedule`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ scheduled_date: dateString });
    expect(res.statusCode).toBe(200);
    expect(res.body.scheduled_date).toBeDefined();
    expect(res.body.reminder_sent).toBe(false);
  });

  it('7.10 admin can reschedule any follow-up', async () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 20);
    const dateString = newDate.toISOString().split('T')[0];
    const res = await request(app)
      .put(`/api/follow-ups/${rescheduleFollowUpId}/reschedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scheduled_date: dateString });
    expect(res.statusCode).toBe(200);
    expect(res.body.scheduled_date).toBeDefined();
  });

  it('7.10 reschedule without scheduled_date returns 400', async () => {
    const res = await request(app)
      .put(`/api/follow-ups/${rescheduleFollowUpId}/reschedule`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('7.10 patient cannot reschedule (403)', async () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 25);
    const res = await request(app)
      .put(`/api/follow-ups/${rescheduleFollowUpId}/reschedule`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ scheduled_date: newDate.toISOString().split('T')[0] });
    expect(res.statusCode).toBe(403);
  });

  // 6.25-style auth check
  it('unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/follow-ups/admin');
    expect(res.statusCode).toBe(401);
  });
});
