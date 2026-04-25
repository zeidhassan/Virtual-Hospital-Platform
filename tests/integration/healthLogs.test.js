const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Health Logs API (Section 7.9–7.11)', () => {
  let patientToken, doctorToken;
  let patientId;

  beforeAll(async () => {
    const [patientRes, doctorRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'patient123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'doctor123' }),
    ]);
    patientToken = patientRes.body.token;
    doctorToken  = doctorRes.body.token;

    const pRow = await pool.query("SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'jane@helixacare.com'");
    patientId = pRow.rows[0]?.id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM health_logs WHERE notes LIKE $1', ['%integration test%']);
    await pool.end();
  });

  // 7.9 — Patient submits health logs
  it('7.9 patient can submit vitals log', async () => {
    const res = await request(app)
      .post('/api/health-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        log_type: 'vitals',
        data: { heart_rate: 72, blood_pressure: '120/80', temperature: 36.6 },
        notes: 'Morning vitals - integration test',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.log_type).toBe('vitals');
    expect(res.body).toHaveProperty('id');
  });

  it('7.9 patient can submit symptom update log', async () => {
    const res = await request(app)
      .post('/api/health-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        log_type: 'symptom_update',
        data: { symptoms: ['headache', 'fatigue'], severity: 'mild' },
        notes: 'Symptom update - integration test',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.log_type).toBe('symptom_update');
  });

  it('7.9 patient can submit medication adherence log', async () => {
    const res = await request(app)
      .post('/api/health-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        log_type: 'medication_adherence',
        data: { medication: 'Metformin 500mg', taken: true, time: '08:00' },
        notes: 'Med log - integration test',
      });
    expect(res.statusCode).toBe(201);
  });

  it('7.9 patient can submit general log (no data field required)', async () => {
    const res = await request(app)
      .post('/api/health-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ log_type: 'general', notes: 'Feeling good today - integration test' });
    expect(res.statusCode).toBe(201);
  });

  it('7.9 missing log_type returns 400', async () => {
    const res = await request(app)
      .post('/api/health-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ notes: 'no type' });
    expect(res.statusCode).toBe(400);
  });

  it('7.9 invalid log_type returns 400', async () => {
    const res = await request(app)
      .post('/api/health-logs')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ log_type: 'banana' });
    expect(res.statusCode).toBe(400);
  });

  it('7.9 doctor cannot submit health log (403)', async () => {
    const res = await request(app)
      .post('/api/health-logs')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ log_type: 'general', notes: 'should fail' });
    expect(res.statusCode).toBe(403);
  });

  // 7.10 — Patient views own history
  it('7.10 patient can view own health log history', async () => {
    const res = await request(app)
      .get('/api/health-logs/my')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('7.10 patient can filter logs by type', async () => {
    const res = await request(app)
      .get('/api/health-logs/my?log_type=vitals')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    res.body.data.forEach((log) => expect(log.log_type).toBe('vitals'));
  });

  // 7.11 — Doctor views patient logs
  it('7.11 doctor with appointment can view patient health logs', async () => {
    const res = await request(app)
      .get(`/api/health-logs/patient/${patientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('7.11 unauthenticated returns 401', async () => {
    const res = await request(app).get(`/api/health-logs/patient/${patientId}`);
    expect(res.statusCode).toBe(401);
  });
});
