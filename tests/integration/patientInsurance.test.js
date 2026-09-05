const request = require('supertest');
const app = require('../../src/app');

describe('Patient Insurance Policy API Tests', () => {
  let patientToken;
  let doctorToken;

  beforeAll(async () => {
    const loginPatient = await request(app).post('/api/auth/login').send({
      email: 'jane@helixacare.com',
      password: 'admin123',
    });
    patientToken = loginPatient.body.token;

    const loginDoctor = await request(app).post('/api/auth/login').send({
      email: 'strange@helixacare.com',
      password: 'admin123',
    });
    doctorToken = loginDoctor.body.token;
  });

  it('should return null policy when patient has no active policy (after cancel)', async () => {
    // Cancel any existing demo policy first
    await request(app)
      .delete('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`);

    const res = await request(app)
      .get('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.policy).toBeNull();
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/insurance-requests/policy');
    expect(res.statusCode).toBe(401);
  });

  it('should reject doctor from accessing patient policy endpoint', async () => {
    const res = await request(app)
      .get('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('should return 400 when saving policy with missing fields', async () => {
    const res = await request(app)
      .post('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ insurance_company: 'AIA' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should save a new insurance policy', async () => {
    const res = await request(app)
      .post('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        insurance_company: 'AIA Malaysia',
        insurance_id_number: 'AIA-TEST-001',
        start_date: '2025-01-01',
        end_date: '2026-01-01',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.policy).toHaveProperty('id');
    expect(res.body.policy.insurance_company).toBe('AIA Malaysia');
    expect(res.body.policy.is_active).toBe(true);
  });

  it('should retrieve the active policy', async () => {
    const res = await request(app)
      .get('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.policy).not.toBeNull();
    expect(res.body.policy.insurance_company).toBe('AIA Malaysia');
    expect(res.body.policy.is_active).toBe(true);
  });

  it('should replace the active policy when saving a new one (only one active at a time)', async () => {
    const res = await request(app)
      .post('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        insurance_company: 'Prudential BSN Takaful',
        insurance_id_number: 'PRU-TEST-002',
        start_date: '2025-06-01',
        end_date: '2026-06-01',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.policy.insurance_company).toBe('Prudential BSN Takaful');
  });

  it('should return only the new active policy (old one deactivated)', async () => {
    const res = await request(app)
      .get('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.policy.insurance_company).toBe('Prudential BSN Takaful');
  });

  it('should cancel the active policy', async () => {
    const res = await request(app)
      .delete('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('should return null policy after cancellation', async () => {
    const res = await request(app)
      .get('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.policy).toBeNull();
  });

  it('should return 404 when cancelling with no active policy', async () => {
    const res = await request(app)
      .delete('/api/insurance-requests/policy')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(404);
  });
});
