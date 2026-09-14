// Closes a real test-coverage gap found during a full-project audit: roughly
// 25 of the ~31 generic /api/adminBoard/* CRUD entities had zero automated
// tests (only appointments, messages, notifications, subscriptions,
// support-tickets, and patient-health-programs had any coverage before this
// file). All of these entities share the same generic controller pattern
// (paginate + handleDbError CRUD), so this is one data-driven suite rather
// than 25 near-identical files — each entry runs create -> list -> get-by-id
// -> update -> delete against the real route, plus a 403 check for a
// non-admin token.
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

const ts = Date.now();

describe('Admin Board generic CRUD coverage', () => {
  let adminToken, doctorToken;
  let ids; // real FK-safe ids fetched from the seeded test DB

  beforeAll(async () => {
    const [adminRes, doctorRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'admin123' }),
    ]);
    adminToken = adminRes.body.token;
    doctorToken = doctorRes.body.token;

    // Always selects a column literally named `id` — SELECT user_id FROM
    // patients would otherwise silently resolve to undefined here (no `.id`
    // on a {user_id: N} row), and axios drops undefined-valued keys, which
    // surfaced as "Missing required field: user_id" on every entity that
    // needs a real user_id (payment_methods, payment_transactions, billing_addresses).
    const q = (sql) => pool.query(sql).then((r) => r.rows[0]?.id);
    ids = {
      patientId: await q('SELECT id FROM patients LIMIT 1'),
      doctorId: await q('SELECT id FROM doctors LIMIT 1'),
      userIdPatient: await q('SELECT user_id AS id FROM patients LIMIT 1'),
      userIdDoctor: await q('SELECT user_id AS id FROM doctors LIMIT 1'),
      userIdAdmin: await q("SELECT id FROM users WHERE role = 'admin' LIMIT 1"),
      appointmentId: await q('SELECT id FROM appointments LIMIT 1'),
      medicationId: await q('SELECT id FROM medications LIMIT 1'),
      prescriptionId: await q('SELECT id FROM prescriptions LIMIT 1'),
      billId: await q('SELECT id FROM bills LIMIT 1'),
      questionId: await q('SELECT id FROM question_bank LIMIT 1'),
      responseId: await q('SELECT id FROM patient_question_responses LIMIT 1'),
      ticketId: await q('SELECT id FROM support_tickets LIMIT 1'),
    };
  });

  // A handful of entities need a bit more setup than a flat payload (a
  // dedicated FK row, or a field that must be unique). Built once here so
  // every describe-block config below can just be a plain object.
  let doctorPlanId, freshConversationId;

  beforeAll(async () => {
    const dp = await pool.query(
      `INSERT INTO doctor_plans (name, description, monthly_price, yearly_price, features, currency)
       VALUES ($1, 'coverage test plan', 9.99, 99.99, '["a"]', 'MYR') RETURNING id`,
      [`Coverage Test Doctor Plan ${ts}`]
    );
    doctorPlanId = dp.rows[0].id;

    const conv = await pool.query(
      `INSERT INTO conversations (title, is_group, created_by) VALUES ($1, false, $2) RETURNING id`,
      [`Coverage Test Conversation ${ts}`, ids.userIdAdmin]
    );
    freshConversationId = conv.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM conversations WHERE id = $1', [freshConversationId]);
    await pool.query('DELETE FROM doctor_plans WHERE id = $1', [doctorPlanId]);
  });

  // create/update are lazy functions, not plain values — this whole array is
  // built once at module-load time (for describe.each below), well before
  // beforeAll has populated `ids`, so nothing in here can read `ids` eagerly.
  const entities = () => [
    {
      path: 'users',
      // updateUser (like several other adminBoard controllers below)
      // requires the same fields as create, not just the changed one —
      // fullUpdate sends the whole create() payload with one field overridden.
      fullUpdate: true,
      create: () => ({ full_name: 'Coverage Test User', email: `admincov_${ts}@test.com`, password: 'testpass123', role: 'patient', phone: '1112223333', gender: 'male', date_of_birth: '1990-01-01' }),
      update: () => ({ field: 'full_name', value: 'Coverage Test User Updated' }),
    },
    {
      path: 'doctors',
      create: () => ({ user_id: ids.userIdDoctor, specialization: 'Coverage Testing', qualifications: 'MD', availability_status: 'available', bio: 'test' }),
      update: () => ({ field: 'specialization', value: 'Updated Specialization' }),
    },
    {
      path: 'patients',
      create: () => ({ user_id: ids.userIdPatient, blood_group: 'O+', emergency_contact_name: 'Test Contact', emergency_contact_phone: '1234567890' }),
      update: () => ({ field: 'blood_group', value: 'A+' }),
    },
    {
      path: 'doctor-time-slots',
      create: () => ({ doctor_id: ids.doctorId, day_of_week: 'Sunday', start_time: '08:00', end_time: '08:30' }),
      update: () => ({ field: 'day_of_week', value: 'Saturday' }),
    },
    {
      path: 'appointment-status-logs',
      create: () => ({ appointment_id: ids.appointmentId, old_status: 'pending', new_status: 'confirmed' }),
      update: () => ({ field: 'new_status', value: 'completed' }),
    },
    {
      path: 'prescriptions',
      create: () => ({ appointment_id: ids.appointmentId, medication_id: ids.medicationId, dosage: '10mg', instructions: 'Take twice daily', issued_date: '2026-01-01', pack_limit: 2 }),
      update: () => ({ field: 'dosage', value: '20mg' }),
    },
    {
      path: 'medical-records',
      create: () => ({ patient_id: ids.patientId, doctor_id: ids.doctorId, appointment_id: ids.appointmentId, record_type: 'lab_result', description: 'Coverage test record', private: false }),
      update: () => ({ field: 'description', value: 'Updated description' }),
    },
    {
      path: 'bills',
      create: () => ({ patient_id: ids.patientId, amount: 100.5, status: 'pending', billing_date: '2026-01-01', details: 'Coverage test bill' }),
      update: () => ({ field: 'status', value: 'paid' }),
    },
    {
      path: 'plans',
      fullUpdate: true,
      create: () => ({ name: `Coverage Test Plan ${ts}`, description: 'test', price: 9.99, duration_days: 30, features: ['a', 'b'] }),
      update: () => ({ field: 'description', value: 'Updated description' }),
    },
    {
      path: 'medications',
      fullUpdate: true,
      create: () => ({ name: `Coverage Test Medication ${ts}`, type: 'prescription', description: 'test', price: 5.99 }),
      update: () => ({ field: 'price', value: 6.99 }),
    },
    {
      path: 'pharmacy-orders',
      fullUpdate: true,
      create: () => ({ patient_id: ids.patientId, prescription_id: ids.prescriptionId, medications: 'Coverage Test Med', quantities: '1', total_amount: 10, status: 'pending', delivery_address: '123 Test St', payment_method: 'cash' }),
      update: () => ({ field: 'status', value: 'processing' }),
    },
    {
      path: 'question-bank',
      fullUpdate: true,
      create: () => ({ question_text: 'Coverage test question?', question_type: 'public' }),
      update: () => ({ field: 'is_approved', value: true }),
    },
    {
      path: 'patient-question-responses',
      create: () => ({ patient_id: ids.patientId, question_id: ids.questionId, answer: 'Coverage test answer' }),
      update: () => ({ field: 'answer', value: 'Updated answer' }),
    },
    {
      path: 'doctor-response-notes',
      create: () => ({ doctor_id: ids.doctorId, response_id: ids.responseId, note: 'Coverage test note' }),
      update: () => ({ field: 'note', value: 'Updated note' }),
    },
    {
      path: 'doctor-plans',
      fullUpdate: true,
      // features is JSONB here (plans.features, the other entity below, is a
      // real TEXT[] column) — a JS array gets serialized by pg as a Postgres
      // array literal, not JSON, and Postgres then rejects it as invalid
      // JSON syntax. A plain object serializes correctly for JSONB.
      create: () => ({ name: `Coverage Test Doctor Plan Entity ${ts}`, description: 'test', monthly_price: 19.99, yearly_price: 199.99, features: { perk: 'unlimited' } }),
      update: () => ({ field: 'description', value: 'Updated description' }),
    },
    {
      path: 'doctor-subscriptions',
      create: () => ({ user_id: ids.userIdDoctor, plan_id: doctorPlanId, billing_cycle: 'monthly', status: 'pending', start_date: '2026-01-01', end_date: '2027-01-01' }),
      update: () => ({ field: 'status', value: 'approved' }),
    },
    {
      path: 'insurance-requests',
      fullUpdate: true,
      create: () => ({ patient_id: ids.patientId, doctor_id: ids.doctorId, bill_id: ids.billId, insurance_company: 'Coverage Test Co', insurance_id_number: `INS${ts}`, start_date: '2026-01-01', end_date: '2027-01-01' }),
      update: () => ({ field: 'status', value: 'accepted' }),
    },
    {
      path: 'support-ticket-replies',
      create: () => ({ ticket_id: ids.ticketId, user_id: ids.userIdPatient, message: 'Coverage test reply' }),
      update: () => ({ field: 'message', value: 'Updated reply' }),
    },
    {
      path: 'services',
      create: () => ({ name: `Coverage Test Service ${ts}`, description: 'test', cost: 15.5 }),
      update: () => ({ field: 'cost', value: 20 }),
    },
    {
      path: 'health-programs',
      create: () => ({ name: `Coverage Test Program ${ts}`, description: 'test', start_date: '2026-01-01', end_date: '2026-06-01', eligibility: 'All patients' }),
      update: () => ({ field: 'description', value: 'Updated description' }),
    },
    {
      path: 'health-logs',
      fullUpdate: true,
      create: () => ({ patient_id: ids.patientId, log_type: 'vitals', data: { bp: '120/80' }, notes: 'Coverage test log' }),
      update: () => ({ field: 'notes', value: 'Updated notes' }),
    },
    {
      path: 'patient-insurance',
      // is_active: false — patient 1 already has an active policy, and a
      // partial unique index allows only one active row per patient.
      fullUpdate: true,
      create: () => ({ patient_id: ids.patientId, insurance_company: 'Coverage Test Co', insurance_id_number: `INS${ts}`, start_date: '2026-01-01', end_date: '2027-01-01', is_active: false }),
      update: () => ({ field: 'insurance_company', value: 'Updated Co' }),
    },
    {
      path: 'payment-methods',
      create: () => ({ user_id: ids.userIdPatient, provider: 'card', cardholder_name: 'Coverage Test', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 }),
      update: () => ({ field: 'cardholder_name', value: 'Updated Name' }),
    },
    {
      path: 'payment-transactions',
      fullUpdate: true,
      create: () => ({ user_id: ids.userIdPatient, bill_id: ids.billId, amount: 50, method_type: 'card', transaction_ref: `TESTREF${ts}`, status: 'pending' }),
      update: () => ({ field: 'status', value: 'success' }),
    },
    {
      path: 'billing-addresses',
      fullUpdate: true,
      create: () => ({ user_id: ids.userIdPatient, addr_type: 'billing', first_name: 'Coverage', last_name: 'Test', line1: '123 Test St', city: 'Testville', country_code: 'MY' }),
      update: () => ({ field: 'city', value: 'Updated City' }),
    },
    {
      path: 'conversations',
      create: () => ({ title: `Coverage Test Conversation ${ts}`, is_group: false, created_by: ids.userIdAdmin }),
      update: () => ({ field: 'title', value: 'Updated Title' }),
    },
    {
      path: 'conversation-participants',
      create: () => ({ conversation_id: freshConversationId, user_id: ids.userIdDoctor, is_pinned: false }),
      update: () => ({ field: 'is_pinned', value: true }),
    },
    {
      path: 'question-assignments',
      create: () => ({ question_id: ids.questionId, patient_id: ids.patientId, doctor_id: ids.doctorId }),
      update: () => ({ field: 'response_id', value: ids.responseId }),
    },
    {
      path: 'triage-sessions',
      fullUpdate: true,
      create: () => ({ patient_id: ids.patientId, symptoms_text: 'Coverage test symptoms', urgency_level: 'standard', recommended_action: 'Coverage test action', recommended_department: 'General Practice' }),
      update: () => ({ field: 'urgency_level', value: 'urgent' }),
    },
    {
      path: 'triage-symptom-rules',
      fullUpdate: true,
      create: () => ({ urgency_level: 'standard', keywords: 'coverage_test_keyword_xyz', recommended_action: 'Coverage test action', recommended_department: 'Test Department' }),
      update: () => ({ field: 'recommended_action', value: 'Updated action' }),
    },
  ];

  describe.each(entities().map((e) => [e.path, e]))('/api/adminBoard/%s', (path, config) => {
    let createdId;

    it('rejects a non-admin with 403', async () => {
      const res = await request(app)
        .get(`/api/adminBoard/${path}`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect([401, 403]).toContain(res.statusCode);
    });

    it('creates a row', async () => {
      const res = await request(app)
        .post(`/api/adminBoard/${path}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(config.create());
      expect(res.statusCode).toBe(201);
      const body = res.body.id !== undefined ? res.body : res.body.data;
      expect(body).toHaveProperty('id');
      createdId = body.id;
    });

    it('lists rows with the standard paginate envelope', async () => {
      const res = await request(app)
        .get(`/api/adminBoard/${path}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('gets the created row by id', async () => {
      if (!createdId) return;
      const res = await request(app)
        .get(`/api/adminBoard/${path}/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      const body = res.body.id !== undefined ? res.body : res.body.data;
      expect(body.id).toBe(createdId);
    });

    it('updates the created row', async () => {
      if (!createdId) return;
      const { field, value } = config.update();
      // Some adminBoard update handlers require the same fields as create
      // (a partial {field: value} body 400s with "Missing required field:
      // ..." for whatever wasn't included) — fullUpdate resends the whole
      // create() payload with just that one field overridden.
      const payload = config.fullUpdate ? { ...config.create(), [field]: value } : { [field]: value };
      const res = await request(app)
        .put(`/api/adminBoard/${path}/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(res.statusCode).toBe(200);
    });

    it('deletes the created row', async () => {
      if (!createdId) return;
      const res = await request(app)
        .delete(`/api/adminBoard/${path}/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
