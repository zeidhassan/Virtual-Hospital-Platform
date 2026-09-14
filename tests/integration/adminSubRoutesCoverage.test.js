// Closes a real test-coverage gap found during a full-project audit:
// /api/dashboard and several /api/admin/* sub-routes (billing, charts,
// doctor-plans, doctor-time-slots, insurance, questions, subscriptions) had
// zero automated tests.
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Dashboard + remaining admin sub-route coverage', () => {
  let adminToken, doctorToken, patientToken;

  beforeAll(async () => {
    const [adminRes, doctorRes, patientRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'admin123' }),
    ]);
    adminToken = adminRes.body.token;
    doctorToken = doctorRes.body.token;
    patientToken = patientRes.body.token;
  });

  describe('/api/dashboard', () => {
    it('admin gets the admin dashboard', async () => {
      const res = await request(app).get('/api/dashboard/admin').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.role).toBe('admin');
    });

    it('doctor gets the doctor dashboard', async () => {
      const res = await request(app).get('/api/dashboard/doctor').set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.role).toBe('doctor');
    });

    it('patient gets the patient dashboard', async () => {
      const res = await request(app).get('/api/dashboard/patient').set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.role).toBe('patient');
    });

    it('a patient is rejected from the admin dashboard with 403', async () => {
      const res = await request(app).get('/api/dashboard/admin').set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('unauthenticated request returns 401', async () => {
      const res = await request(app).get('/api/dashboard/admin');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('/api/admin/billing', () => {
    it('admin can list bills', async () => {
      const res = await request(app).get('/api/admin/billing').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('admin can filter bills by status', async () => {
      const res = await request(app).get('/api/admin/billing?status=paid').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('a doctor is rejected with 403', async () => {
      const res = await request(app).get('/api/admin/billing').set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('CSV export responds with 200', async () => {
      const res = await request(app).get('/api/admin/billing/export/csv').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('/api/admin/charts', () => {
    it('admin can view top doctors chart', async () => {
      const res = await request(app).get('/api/admin/charts/top-doctors').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('a doctor is also allowed (admin or doctor)', async () => {
      const res = await request(app).get('/api/admin/charts/top-doctors').set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('a patient is rejected with 403', async () => {
      const res = await request(app).get('/api/admin/charts/top-doctors').set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('top-medications chart works', async () => {
      const res = await request(app).get('/api/admin/charts/top-medications').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('subscription-distribution chart works', async () => {
      const res = await request(app).get('/api/admin/charts/subscription-distribution').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('/api/admin/doctor-time-slots', () => {
    it('admin can list all doctor time slots', async () => {
      const res = await request(app).get('/api/admin/doctor-time-slots').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('a doctor is rejected with 403 (admin-only board)', async () => {
      const res = await request(app).get('/api/admin/doctor-time-slots').set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('/api/admin/insurance', () => {
    it('admin can view insurance usage stats', async () => {
      const res = await request(app).get('/api/admin/insurance/stats').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('admin can view bills by payment type', async () => {
      const res = await request(app).get('/api/admin/insurance/bills?payment_type=direct').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('a doctor is rejected with 403', async () => {
      const res = await request(app).get('/api/admin/insurance/stats').set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('/api/admin/subscriptions', () => {
    it('admin can list subscriptions', async () => {
      const res = await request(app).get('/api/admin/subscriptions').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('a doctor is rejected with 403', async () => {
      const res = await request(app).get('/api/admin/subscriptions').set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('/api/admin/doctor-plans', () => {
    it('admin can view subscription stats', async () => {
      const res = await request(app).get('/api/admin/doctor-plans/subscription-stats').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('admin can view doctors grouped by plan', async () => {
      const res = await request(app).get('/api/admin/doctor-plans/doctors-by-plan').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('a doctor is rejected with 403', async () => {
      const res = await request(app).get('/api/admin/doctor-plans/subscription-stats').set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('/api/admin/questions', () => {
    let questionId;

    beforeAll(async () => {
      const q = await pool.query(
        `INSERT INTO question_bank (question_text, question_type, is_approved) VALUES ($1, 'public', false) RETURNING id`,
        ['Coverage test question for admin approval?']
      );
      questionId = q.rows[0].id;
    });

    afterAll(async () => {
      await pool.query('DELETE FROM question_bank WHERE id = $1', [questionId]);
    });

    it('admin can list questions', async () => {
      const res = await request(app).get('/api/admin/questions').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('admin can approve a question', async () => {
      const res = await request(app).put(`/api/admin/questions/${questionId}/approve`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      const check = await pool.query('SELECT is_approved FROM question_bank WHERE id = $1', [questionId]);
      expect(check.rows[0].is_approved).toBe(true);
    });

    it('a doctor is rejected with 403', async () => {
      const res = await request(app).get('/api/admin/questions').set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(403);
    });
  });
});
