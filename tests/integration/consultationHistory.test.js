const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Consultation History API (Section 8.1–8.10)', () => {
  let adminToken, doctorToken, patientToken, patientToken2;
  let patientId, patientId2;

  beforeAll(async () => {
    const [adminRes, doctorRes, patientRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'doctor123' }),
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'patient123' }),
    ]);
    adminToken   = adminRes.body.token;
    doctorToken  = doctorRes.body.token;
    patientToken = patientRes.body.token;

    const pRow = await pool.query(
      "SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'jane@helixacare.com'"
    );
    patientId = pRow.rows[0]?.id;

    // Register and login a second patient for 8.9 test
    const email2 = `testpatient2_hist_${Date.now()}@helixacare.com`;
    await request(app).post('/api/auth/register').send({
      full_name: 'Test Patient Two',
      email: email2,
      password: 'testpass123',
      role: 'patient',
    });
    const login2 = await request(app).post('/api/auth/login').send({ email: email2, password: 'testpass123' });
    patientToken2 = login2.body.token;
    const p2Row = await pool.query(
      'SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = $1',
      [email2]
    );
    patientId2 = p2Row.rows[0]?.id;
  });

  afterAll(async () => {
    await pool.query(
      "DELETE FROM users WHERE email LIKE 'testpatient2_hist_%@helixacare.com'"
    );
    await pool.end();
  });

  // 8.1 — Patient can view unified care timeline
  it('8.1 patient can view own timeline', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('limit');
    expect(res.body).toHaveProperty('offset');
  });

  // 8.2 — Sorted chronologically newest first
  it('8.2 timeline is sorted newest first', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    const dates = res.body.data.map(e => new Date(e.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  // 8.3 — Each entry has type, date, summary, details
  it('8.3 each timeline entry has required fields', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    if (res.body.data.length > 0) {
      const entry = res.body.data[0];
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('summary');
      expect(entry).toHaveProperty('details');
    }
  });

  // 8.4 — Filter by type
  it('8.4 filter by type returns only that type', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}?type=triage`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    res.body.data.forEach(e => expect(e.type).toBe('triage'));
  });

  it('8.4 filter by comma-separated types', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}?type=triage,appointment`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    res.body.data.forEach(e => expect(['triage', 'appointment']).toContain(e.type));
  });

  // 8.5 — Date range filter
  it('8.5 date range filter works', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}?date_from=2020-01-01&date_to=2030-12-31`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('8.5 future date range returns empty', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}?date_from=2099-01-01&date_to=2099-12-31`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  // 8.6 — Pagination
  it('8.6 pagination limit is respected', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}?limit=2&offset=0`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(0);
  });

  it('8.6 offset pagination shifts results', async () => {
    const [r1, r2] = await Promise.all([
      request(app)
        .get(`/api/consultation-history/patient/${patientId}?limit=2&offset=0`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .get(`/api/consultation-history/patient/${patientId}?limit=2&offset=2`)
        .set('Authorization', `Bearer ${adminToken}`),
    ]);
    if (r1.body.total > 2 && r2.body.data.length > 0) {
      expect(r1.body.data[0].id).not.toBe(r2.body.data[0].id);
    }
  });

  // 8.7 — Doctor can view assigned patient's timeline
  it('8.7 doctor with appointment can view patient timeline', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(200);
  });

  // 8.8 — Admin can view any patient's timeline
  it('8.8 admin can view any patient timeline', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
  });

  // 8.9 — Patient cannot view another patient's timeline
  it('8.9 patient cannot view another patient timeline', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}`)
      .set('Authorization', `Bearer ${patientToken2}`);
    expect(res.statusCode).toBe(403);
  });

  // 8.9 — Patient can view own timeline
  it('8.9 patient can view own timeline (positive)', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
  });

  // 8.10 — Summary endpoint
  it('8.10 summary endpoint returns counts per type', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('triage');
    expect(res.body).toHaveProperty('appointments');
    expect(res.body).toHaveProperty('prescriptions');
    expect(res.body).toHaveProperty('medical_records');
    expect(res.body).toHaveProperty('follow_ups');
    expect(res.body).toHaveProperty('health_logs');
    Object.values(res.body).forEach(v => expect(typeof v).toBe('number'));
  });

  it('8.10 patient can view own summary', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}/summary`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('triage');
  });

  // Auth guards
  it('requires auth token', async () => {
    const res = await request(app)
      .get(`/api/consultation-history/patient/${patientId}`);
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 for non-existent patient', async () => {
    const res = await request(app)
      .get('/api/consultation-history/patient/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(404);
  });
});
