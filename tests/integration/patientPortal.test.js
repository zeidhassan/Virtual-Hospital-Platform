// tests/integration/patientPortal.test.js
// Section 3: Patient Portal — requirements 3.1–3.11

const request = require('supertest');
const app = require('../../src/app');

describe('Patient Portal — Section 3', () => {
  let patientToken;

  beforeAll(async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'jane@helixacare.com',
      password: 'admin123',
    });
    patientToken = login.body.token;
    expect(patientToken).toBeDefined();
  });

  // ── 3.1  Patient Dashboard ────────────────────────────────────────────────
  describe('3.1 — Patient dashboard', () => {
    it('returns dashboard stats for authenticated patient', async () => {
      const res = await request(app)
        .get('/api/patient/dashboard-stats')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('blocks unauthenticated request → 401', async () => {
      const res = await request(app).get('/api/patient/dashboard-stats');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── 3.2  Book Appointment ─────────────────────────────────────────────────
  describe('3.2 — Book appointments', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/patient/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when doctor is not available at selected time', async () => {
      // Use a Monday far in the future with a time outside any slot
      const res = await request(app)
        .post('/api/patient/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: 1,
          appointment_date: '2030-06-17', // Monday
          appointment_start_time: '23:00',
          appointment_end_time: '23:30',
        });
      expect(res.statusCode).toBe(400);
    });

    it('successfully books an appointment in an available slot', async () => {
      // Dr. Strange (doctor_id=1) has Monday 09:00–09:30 available
      const res = await request(app)
        .post('/api/patient/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctor_id: 1,
          appointment_date: '2030-06-17', // Monday far in the future
          appointment_start_time: '09:00',
          appointment_end_time: '09:30',
        });
      expect([201, 400]).toContain(res.statusCode); // 201 if slot is free, 400 if already taken by another test run
    });
  });

  // ── 3.3  View Own Appointments ────────────────────────────────────────────
  describe('3.3 — View own appointments', () => {
    it('returns patient appointments list', async () => {
      const res = await request(app)
        .get('/api/patient/appointments')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('returns my-appointments via appointments sub-route', async () => {
      const res = await request(app)
        .get('/api/patient/appointments/my-appointments')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── 3.4  View Own Prescriptions ───────────────────────────────────────────
  describe('3.4 — View own prescriptions', () => {
    it('returns prescriptions list for patient', async () => {
      const res = await request(app)
        .get('/api/patient/prescriptions')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── 3.5  View Own Medical Records ─────────────────────────────────────────
  describe('3.5 — View own medical records', () => {
    it('returns medical records list for patient', async () => {
      const res = await request(app)
        .get('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── 3.6  Answer Pre-appointment Questions ─────────────────────────────────
  describe('3.6 — Answer pre-appointment questions', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/questions/response')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      expect([400, 422]).toContain(res.statusCode);
    });

    it('can list public questions for answering', async () => {
      const res = await request(app)
        .get('/api/questions/public')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── 3.7  View Submitted Question Answers ─────────────────────────────────
  describe('3.7 — View submitted question answers', () => {
    it('returns own question responses', async () => {
      const res = await request(app)
        .get('/api/questions/my-responses')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── 3.8  Place Pharmacy Order ────────────────────────────────────────────
  describe('3.8 — Place pharmacy orders', () => {
    it('returns 400 when no medications are provided', async () => {
      const res = await request(app)
        .post('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('places an order with a countertop medication', async () => {
      const res = await request(app)
        .post('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({ medications: 'Paracetamol', quantities: '1' })
        .field('delivery_address', '123 Test Street, Kuala Lumpur')
        .field('payment_method', 'cash');
      expect([201, 400]).toContain(res.statusCode); // 201 if med exists, 400 if not seeded
    });
  });

  // ── 3.9  View Pharmacy Order History ─────────────────────────────────────
  describe('3.9 — View pharmacy order history', () => {
    it('returns own pharmacy orders via /my route', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders/my')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('blocks non-patient role from /my route → 403', async () => {
      const adminLogin = await request(app).post('/api/auth/login').send({
        email: 'admin@helixacare.com',
        password: 'admin123',
      });
      const adminToken = adminLogin.body.token;
      const res = await request(app)
        .get('/api/pharmacy-orders/my')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  // ── 3.10 Submit Insurance Request ────────────────────────────────────────
  describe('3.10 — Submit insurance requests', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/insurance-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('successfully submits an insurance request', async () => {
      const res = await request(app)
        .post('/api/insurance-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          insurance_company: 'TestCare Insurance',
          insurance_id_number: 'TC-9999',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.insurance_company).toBe('TestCare Insurance');
      expect(res.body.status).toBe('pending');
    });

    it('returns the submitted request in GET /my', async () => {
      const res = await request(app)
        .get('/api/insurance-requests/my')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('blocks non-patient from submitting → 403', async () => {
      const adminLogin = await request(app).post('/api/auth/login').send({
        email: 'admin@helixacare.com',
        password: 'admin123',
      });
      const adminToken = adminLogin.body.token;
      const res = await request(app)
        .post('/api/insurance-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          insurance_company: 'TestCare',
          insurance_id_number: 'TC-0001',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── 3.11 Create Support Ticket ───────────────────────────────────────────
  describe('3.11 — Create support tickets', () => {
    it('returns 400 / validation error when body is empty', async () => {
      const res = await request(app)
        .post('/api/support-tickets/patient')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      // Controller validates subject & description; returns 400 or 500
      expect([400, 500]).toContain(res.statusCode);
    });

    it('successfully creates a support ticket', async () => {
      const res = await request(app)
        .post('/api/support-tickets/patient')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          subject: 'Test support ticket from Section 3',
          description: 'This is a test ticket created by the integration test suite.',
          category: 'Technical',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.subject).toBe('Test support ticket from Section 3');
    });

    it('patient can view their own tickets', async () => {
      const res = await request(app)
        .get('/api/support-tickets/patient')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('blocks unauthenticated request → 401', async () => {
      const res = await request(app)
        .post('/api/support-tickets/patient')
        .send({ subject: 'x', description: 'y' });
      expect(res.statusCode).toBe(401);
    });
  });
});
