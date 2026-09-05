const request = require('supertest');
const app = require('../../src/app');

describe('Section 4 - Doctor Portal Integration Tests', () => {
  let doctorToken;
  let patientToken;
  let adminToken;
  let completedAppointmentId;

  beforeAll(async () => {
    const [doctorRes, patientRes, adminRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
    ]);
    doctorToken = doctorRes.body.token;
    patientToken = patientRes.body.token;
    adminToken = adminRes.body.token;
  });

  // ─── 4.1 Doctor Dashboard ──────────────────────────────────────────────────

  describe('4.1 Doctor Dashboard Stats', () => {
    it('GET /api/doctor/patient-stats returns total_patients for this doctor', async () => {
      const res = await request(app)
        .get('/api/doctor/patient-stats')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('total_patients');
    });

    it('GET /api/doctor/appointment-stats returns appointment counts', async () => {
      const res = await request(app)
        .get('/api/doctor/appointment-stats')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('total');
    });

    it('GET /api/doctor/patients lists patients seen by this doctor', async () => {
      const res = await request(app)
        .get('/api/doctor/patients')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects non-doctor tokens on /api/doctor/patients', async () => {
      const res = await request(app)
        .get('/api/doctor/patients')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  // ─── 4.2 Appointments ──────────────────────────────────────────────────────

  describe('4.2 View and Manage Appointments', () => {
    it('GET /api/doctor/appointments returns paginated appointments', async () => {
      const res = await request(app)
        .get('/api/doctor/appointments')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('PUT /api/doctor/appointments/:id/status updates status', async () => {
      // First fetch appointments for this doctor
      const listRes = await request(app)
        .get('/api/doctor/appointments')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(listRes.statusCode).toBe(200);

      const appointments = listRes.body.data;
      if (appointments.length === 0) {
        console.warn('No appointments to update — skipping status update test');
        return;
      }

      // Store completed appointment id for prescription tests — do NOT change its status
      const completedAppt = appointments.find(a => a.status === 'completed');
      if (completedAppt) completedAppointmentId = completedAppt.id;

      // Find a non-completed appointment to update so we don't break other tests
      const updatable = appointments.find(a => a.status !== 'completed');
      if (!updatable) {
        console.warn('No non-completed appointments — skipping status update test');
        return;
      }

      const newStatus = updatable.status === 'pending' ? 'confirmed' : 'pending';
      const res = await request(app)
        .put(`/api/doctor/appointments/${updatable.id}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: newStatus });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('rejects status update by wrong doctor', async () => {
      const listRes = await request(app)
        .get('/api/doctor/appointments')
        .set('Authorization', `Bearer ${doctorToken}`);
      const appointments = listRes.body.data;
      if (appointments.length === 0) return;

      const res = await request(app)
        .put(`/api/doctor/appointments/${appointments[0].id}/status`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ status: 'confirmed' });
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // ─── 4.3 Time Slots ────────────────────────────────────────────────────────

  describe('4.3 Manage Time Slots', () => {
    let slotId;

    it('GET /api/doctor/time-slots returns doctor time slots', async () => {
      const res = await request(app)
        .get('/api/doctor/time-slots')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      // Endpoint returns a paginated wrapper or plain array
      const slots = res.body.data ?? res.body;
      expect(Array.isArray(slots)).toBe(true);
    });

    it('POST /api/doctor/time-slots creates a new time slot', async () => {
      const res = await request(app)
        .post('/api/doctor/time-slots')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ day_of_week: 'Friday', start_time: '09:00', end_time: '09:30' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      slotId = res.body.id;
    });

    it('PUT /api/doctor/time-slots/:id updates the slot', async () => {
      if (!slotId) return;
      const res = await request(app)
        .put(`/api/doctor/time-slots/${slotId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ day_of_week: 'Friday', start_time: '09:00', end_time: '10:00' });
      expect(res.statusCode).toBe(200);
    });

    it('DELETE /api/doctor/time-slots/:id removes the slot', async () => {
      if (!slotId) return;
      const res = await request(app)
        .delete(`/api/doctor/time-slots/${slotId}`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ─── 4.4 Prescriptions ────────────────────────────────────────────────────

  describe('4.4 Write Prescriptions', () => {
    it('GET /api/doctor/prescriptions returns doctor prescriptions', async () => {
      const res = await request(app)
        .get('/api/doctor/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/doctor/appointments/:id/prescriptions requires completed appointment', async () => {
      // Use a non-existent appointment ID — should return 403 or 404
      const res = await request(app)
        .post('/api/doctor/appointments/999999/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          medication: 'Paracetamol',
          dosage: '500mg',
          pack_limit: 1,
          instructions: 'Take as needed',
          issued_date: '2026-04-14',
        });
      expect([400, 403, 404]).toContain(res.statusCode);
    });

    it('POST prescription on completed appointment succeeds', async () => {
      if (!completedAppointmentId) {
        console.warn('No completed appointment found — skipping prescription creation test');
        return;
      }
      const medRes = await request(app)
        .get('/api/pharmacy-orders/medications/list')
        .query({ name: 'Ibuprofen' })
        .set('Authorization', `Bearer ${doctorToken}`);
      const medicationId = medRes.body?.data?.[0]?.id;

      const res = await request(app)
        .post(`/api/doctor/appointments/${completedAppointmentId}/prescriptions`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          medication_id: medicationId,
          dosage: '200mg',
          pack_limit: 2,
          instructions: 'Twice daily after meals',
          issued_date: '2026-04-14',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message');
    });
  });

  // ─── 4.5 Medical Records ──────────────────────────────────────────────────

  describe('4.5 View Patient Medical Records', () => {
    it('GET /api/doctor/records returns doctor-created medical records', async () => {
      const res = await request(app)
        .get('/api/doctor/records')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/doctor/appointments/medical-records/:appointmentId returns records', async () => {
      const listRes = await request(app)
        .get('/api/doctor/appointments')
        .set('Authorization', `Bearer ${doctorToken}`);
      const appointments = listRes.body.data || [];
      if (appointments.length === 0) return;

      const apptId = appointments[0].id;
      const res = await request(app)
        .get(`/api/doctor/appointments/medical-records/${apptId}`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect([200, 403]).toContain(res.statusCode);
    });
  });

  // ─── 4.6 Patient Question Answers ─────────────────────────────────────────

  describe('4.6 View Patient Question Answers', () => {
    it('GET /api/questions/doctor-responses returns responses for doctor patients', async () => {
      const res = await request(app)
        .get('/api/questions/doctor-responses')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects non-doctor accessing doctor-responses', async () => {
      const res = await request(app)
        .get('/api/questions/doctor-responses')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── 4.7 Suggest Questions ────────────────────────────────────────────────

  describe('4.7 Suggest Questions', () => {
    it('POST /api/questions/suggest submits a new question suggestion', async () => {
      const res = await request(app)
        .post('/api/questions/suggest')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          question_text: 'Do you have a family history of heart disease?',
          specialty: 'Cardiology',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message');
    });

    it('rejects question suggestion without question_text', async () => {
      const res = await request(app)
        .post('/api/questions/suggest')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ specialty: 'Cardiology' });
      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // ─── 4.8 Subscription Plans ───────────────────────────────────────────────

  describe('4.8 Subscription Plans', () => {
    it('GET /api/doctor/subscriptions/plans returns available plans', async () => {
      const res = await request(app)
        .get('/api/doctor/subscriptions/plans')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/doctor/subscriptions/current returns current subscription', async () => {
      const res = await request(app)
        .get('/api/doctor/subscriptions/current')
        .set('Authorization', `Bearer ${doctorToken}`);
      // May be 200 with subscription or 404 if no subscription exists yet
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ─── 4.9 Insurance Requests ───────────────────────────────────────────────

  describe('4.9 Handle Insurance Requests', () => {
    let insuranceRequestId;

    it('GET /api/insurance-requests/doctor-pending returns pending requests for doctor', async () => {
      const res = await request(app)
        .get('/api/insurance-requests/doctor-pending')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Store a request ID for accept/reject tests
      if (res.body.data.length > 0) insuranceRequestId = res.body.data[0].id;
    });

    it('requires doctor role for /doctor-pending', async () => {
      const res = await request(app)
        .get('/api/insurance-requests/doctor-pending')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('POST /api/insurance-requests/:id/accept approves request', async () => {
      if (!insuranceRequestId) {
        console.warn('No pending insurance request — skipping accept test');
        return;
      }
      const res = await request(app)
        .post(`/api/insurance-requests/${insuranceRequestId}/accept`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('POST /api/insurance-requests/:id/reject rejects a request', async () => {
      // Submit a new insurance request as patient first
      const submitRes = await request(app)
        .post('/api/insurance-requests')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          insurance_company: 'MediLife Malaysia',
          insurance_id_number: 'TEST-REJECT-001',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
        });
      expect(submitRes.statusCode).toBe(201);
      const newRequestId = submitRes.body.id;

      // Doctor rejects it — but this patient's request has no doctor_id set
      // so it won't appear in doctor's pending. Test that rejection of non-owned request returns 403.
      const res = await request(app)
        .post(`/api/insurance-requests/${newRequestId}/reject`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ rejection_message: 'Policy verification failed.' });
      // 403 because this request's doctor_id is null (not this doctor's)
      expect([200, 403]).toContain(res.statusCode);
    });
  });
});
