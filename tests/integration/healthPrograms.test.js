const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Health Program Enrollment API', () => {
  let adminToken, doctorToken, patientToken;
  let patientId, programId;

  beforeAll(async () => {
    const [adminRes, doctorRes, patientRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'admin123' }),
    ]);
    adminToken = adminRes.body.token;
    doctorToken = doctorRes.body.token;
    patientToken = patientRes.body.token;

    const pRow = await pool.query("SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'jane@helixacare.com'");
    patientId = pRow.rows[0]?.id;

    const progRow = await pool.query('SELECT id FROM health_programs ORDER BY id LIMIT 1');
    programId = progRow.rows[0]?.id;
  });

  afterAll(async () => {
    if (patientId && programId) {
      await pool.query('DELETE FROM patient_health_programs WHERE patient_id = $1 AND health_program_id = $2', [patientId, programId]);
    }
  });

  it('GET /api/health-programs returns every catalog program with is_enrolled flags', async () => {
    const res = await request(app)
      .get('/api/health-programs')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.programs)).toBe(true);
    expect(res.body.programs.length).toBeGreaterThan(0);
    res.body.programs.forEach((p) => expect(typeof p.is_enrolled).toBe('boolean'));
    // At least one non-enrolled program must still be present — guards the
    // JOIN ON-clause placement (a WHERE there would drop these entirely).
    expect(res.body.programs.some((p) => p.is_enrolled === false)).toBe(true);
  });

  it('POST /api/health-programs/:id/enroll enrolls the caller', async () => {
    const res = await request(app)
      .post(`/api/health-programs/${programId}/enroll`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(201);
  });

  it('enrolling again returns 409 with a clean message, not a raw Postgres error', async () => {
    const res = await request(app)
      .post(`/api/health-programs/${programId}/enroll`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Already enrolled in this program.');
    expect(res.body.error).not.toMatch(/key|constraint|duplicate/i);
  });

  it('concurrent enroll attempts on the same program produce exactly one success', async () => {
    // Clear first so this test starts from a clean slate regardless of order.
    await pool.query('DELETE FROM patient_health_programs WHERE patient_id = $1 AND health_program_id = $2', [patientId, programId]);

    const [a, b] = await Promise.all([
      request(app).post(`/api/health-programs/${programId}/enroll`).set('Authorization', `Bearer ${patientToken}`),
      request(app).post(`/api/health-programs/${programId}/enroll`).set('Authorization', `Bearer ${patientToken}`),
    ]);
    const statuses = [a.statusCode, b.statusCode].sort();
    expect(statuses).toEqual([201, 409]);

    const count = await pool.query(
      'SELECT COUNT(*) FROM patient_health_programs WHERE patient_id = $1 AND health_program_id = $2',
      [patientId, programId]
    );
    expect(parseInt(count.rows[0].count)).toBe(1);
  });

  it('GET /api/health-programs/my lists only enrolled programs', async () => {
    const res = await request(app)
      .get('/api/health-programs/my')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.programs.some((p) => p.id === programId)).toBe(true);
  });

  it('DELETE /api/health-programs/:id/enroll unenrolls the caller', async () => {
    const res = await request(app)
      .delete(`/api/health-programs/${programId}/enroll`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
  });

  it('unenrolling again returns 404', async () => {
    const res = await request(app)
      .delete(`/api/health-programs/${programId}/enroll`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(404);
  });

  it('doctor token is rejected with 403 on all patient routes', async () => {
    const results = await Promise.all([
      request(app).get('/api/health-programs').set('Authorization', `Bearer ${doctorToken}`),
      request(app).get('/api/health-programs/my').set('Authorization', `Bearer ${doctorToken}`),
      request(app).post(`/api/health-programs/${programId}/enroll`).set('Authorization', `Bearer ${doctorToken}`),
      request(app).delete(`/api/health-programs/${programId}/enroll`).set('Authorization', `Bearer ${doctorToken}`),
    ]);
    results.forEach((res) => expect(res.statusCode).toBe(403));
  });

  it('admin token is rejected with 403 on all patient routes', async () => {
    const res = await request(app)
      .get('/api/health-programs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/health-programs');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/adminBoard/patient-health-programs works for admin with the standard paginate envelope', async () => {
    const res = await request(app)
      .get('/api/adminBoard/patient-health-programs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('currentPage');
    expect(res.body).toHaveProperty('totalPages');
  });

  it('GET /api/adminBoard/patient-health-programs rejects a patient with 403', async () => {
    const res = await request(app)
      .get('/api/adminBoard/patient-health-programs')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(403);
  });
});
