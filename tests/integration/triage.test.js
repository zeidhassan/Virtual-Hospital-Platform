// AVA's classifier now calls a real local LLM via axios — mocked here so the
// suite stays fast, deterministic, and doesn't require Ollama to be
// installed/running wherever tests execute (dev machine or CI). axios is
// used nowhere else in src/, so mocking it here can't affect anything but
// the triage classification call.
jest.mock('axios');
const axios = require('axios');

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

// Maps a request's symptom text to the same classification the real
// keyword rules would have produced, so every existing assertion below
// (written against the old rule-based behavior) still holds — the mock
// fakes the LLM's *decision*, not the plumbing around it.
function mockOllamaResponseFor(symptomsText) {
  const lower = symptomsText.toLowerCase();
  let result = { urgency_level: 'standard', recommended_action: 'Schedule an appointment with your doctor within 24-48 hours.', recommended_department: 'General Practice' };
  if (lower.includes('chest pain') || lower.includes('difficulty breathing')) {
    result = { urgency_level: 'emergency', recommended_action: 'Call emergency services immediately. Do not wait.', recommended_department: 'Emergency' };
  } else if (lower.includes('high fever') || lower.includes('persistent headache')) {
    result = { urgency_level: 'urgent', recommended_action: 'Visit the nearest urgent care clinic or emergency department as soon as possible.', recommended_department: 'Urgent Care' };
  } else if (lower.includes('minor cut') || lower.includes('mild skin rash')) {
    result = { urgency_level: 'self_care', recommended_action: 'Rest and treat at home. Monitor for worsening symptoms.', recommended_department: 'Self Care' };
  }
  return { data: { message: { content: JSON.stringify(result) } } };
}

// Set once, at module scope, so it's already active before this file's own
// beforeAll makes its first /assess call — a beforeEach here would run too
// late for that (Jest runs all beforeAll hooks before the first beforeEach).
// The two fallback-path tests below override this for a single call each
// via mockImplementationOnce/mockRejectedValueOnce, then this default
// resumes automatically for whatever runs after them.
axios.post.mockImplementation(async (url, body) => {
  const userMsg = body?.messages?.find((m) => m.role === 'user')?.content || '';
  return mockOllamaResponseFor(userMsg);
});

describe('Triage Integration Tests', () => {
  let patientToken, adminToken, doctorToken;
  let triageSessionId; // shared across tests that need an existing session

  beforeAll(async () => {
    const [patientRes, adminRes, doctorRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'admin123' }),
    ]);
    patientToken = patientRes.body.token;
    adminToken = adminRes.body.token;
    doctorToken = doctorRes.body.token;

    // Create a baseline emergency session so later tests (2.7, 2.9, 2.10, 2.11, 2.12) have a session to work with
    const baseRes = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: 'chest pain and difficulty breathing' });
    triageSessionId = baseRes.body.data.id;
  });

  // 2.1 — patient submits symptoms, receives triage result
  it('2.1: returns urgency_level, recommended_action, recommended_department', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: 'mild cough and slight sore throat today' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('urgency_level');
    expect(res.body.data).toHaveProperty('recommended_action');
    expect(res.body.data).toHaveProperty('recommended_department');
  });

  // 2.2 — emergency classification
  it('2.2: chest pain → emergency', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: 'chest pain and difficulty breathing since this morning' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.urgency_level).toBe('emergency');
  });

  // 2.3 — urgent classification
  it('2.3: high fever + persistent headache → urgent', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: 'high fever and persistent headache for two days' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.urgency_level).toBe('urgent');
  });

  // 2.4 — standard classification
  it('2.4: mild cough + sore throat → standard', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: 'mild cough and sore throat, no fever present' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.urgency_level).toBe('standard');
  });

  // 2.5 — self_care classification
  it('2.5: minor cut + mild skin rash → self_care', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: 'minor cut on finger with a mild skin rash' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.urgency_level).toBe('self_care');
  });

  // LLM-outage resilience: classifySymptoms falls back to the keyword rules
  // rather than failing the whole assessment when Ollama is unreachable or
  // returns something unusable.
  describe('falls back to rule-based classification when the LLM fails', () => {
    it('Ollama connection failure → still 201, classified by the keyword rules', async () => {
      axios.post.mockImplementationOnce(async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
      });
      const res = await request(app)
        .post('/api/triage/assess')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: 'chest pain and difficulty breathing, cannot catch my breath' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.urgency_level).toBe('emergency');
    });

    it('Ollama returns malformed JSON → still 201, classified by the keyword rules', async () => {
      axios.post.mockResolvedValueOnce({ data: { message: { content: 'not valid json at all' } } });
      const res = await request(app)
        .post('/api/triage/assess')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: 'minor cut on finger with a mild skin rash' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.urgency_level).toBe('self_care');
    });

    it('Ollama returns an unsupported urgency level → still 201, classified by the keyword rules', async () => {
      axios.post.mockResolvedValueOnce({
        data: { message: { content: JSON.stringify({ urgency_level: 'critical', recommended_action: 'x', recommended_department: 'y' }) } },
      });
      const res = await request(app)
        .post('/api/triage/assess')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: 'high fever and persistent headache for two days' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.urgency_level).toBe('urgent');
    });
  });

  // 2.6 — session saved to DB
  it('2.6: session appears in triage history after assessment', async () => {
    const histRes = await request(app)
      .get('/api/triage/history')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(histRes.statusCode).toBe(200);
    const ids = histRes.body.data.map(s => s.id);
    expect(ids).toContain(triageSessionId);
  });

  // 2.7 — follow-up auto-created for emergency (as an appointment, appointment_type='follow_up')
  it('2.7: follow-up appointment created for emergency session', async () => {
    const { rows } = await pool.query(
      `SELECT * FROM appointments WHERE triage_session_id = $1 AND appointment_type = 'follow_up'`,
      [triageSessionId]
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].status).toBe('pending');
  });

  // 2.8 — patient views own history
  it('2.8: GET /api/triage/history returns only own sessions', async () => {
    const res = await request(app)
      .get('/api/triage/history')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // 2.9 — patient views own session by ID
  it('2.9: patient can view own triage session by ID', async () => {
    const res = await request(app)
      .get(`/api/triage/session/${triageSessionId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('id', triageSessionId);
  });

  // 2.10 — different patient cannot view the session
  it('2.10: another patient gets 403 when accessing a different patient session', async () => {
    const markRes = await request(app).post('/api/auth/login').send({
      email: 'mark@helixacare.com',
      password: 'password',
    });
    const markToken = markRes.body.token;

    const res = await request(app)
      .get(`/api/triage/session/${triageSessionId}`)
      .set('Authorization', `Bearer ${markToken}`);

    expect(res.statusCode).toBe(403);
  });

  // 2.11 — admin escalates session to doctor
  it('2.11: admin can escalate a triage session to a doctor', async () => {
    const res = await request(app)
      .put(`/api/triage/session/${triageSessionId}/escalate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctor_id: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.escalated_to_doctor_id).toBe(1);
  });

  // 2.12 — doctor views sessions escalated to them
  it('2.12: doctor can view sessions escalated to them', async () => {
    const res = await request(app)
      .get('/api/triage/escalated')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    const ids = res.body.data.map(s => s.id);
    expect(ids).toContain(triageSessionId);
  });

  // 2.13 — admin views all sessions with urgency filter
  it('2.13: admin can filter sessions by urgency_level=emergency', async () => {
    const res = await request(app)
      .get('/api/triage/admin/sessions?urgency_level=emergency')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    res.body.data.forEach(s => expect(s.urgency_level).toBe('emergency'));
  });

  it('2.13b: admin can view all sessions without filter', async () => {
    const res = await request(app)
      .get('/api/triage/admin/sessions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // 2.14 — admin CRUD for rules
  let createdRuleId;

  it('2.14a: admin can create a symptom rule', async () => {
    const res = await request(app)
      .post('/api/triage/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        urgency_level: 'urgent',
        keywords: 'test_symptom_integration_xyz',
        recommended_action: 'Integration test action',
        recommended_department: 'Test Department',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    createdRuleId = res.body.data.id;
  });

  it('2.14b: admin can read all rules', async () => {
    const res = await request(app)
      .get('/api/triage/rules')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    const ids = res.body.data.map(r => r.id);
    expect(ids).toContain(createdRuleId);
  });

  it('2.14c: admin can update a rule', async () => {
    const res = await request(app)
      .put(`/api/triage/rules/${createdRuleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recommended_action: 'Updated integration test action' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.recommended_action).toBe('Updated integration test action');
  });

  it('2.14d: admin can delete a rule', async () => {
    const res = await request(app)
      .delete(`/api/triage/rules/${createdRuleId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  // 2.15 — input validation
  it('2.15a: empty symptoms → 400', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: '' });

    expect(res.statusCode).toBe(400);
  });

  it('2.15b: symptoms shorter than 10 chars → 400', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ symptoms: 'pain' });

    expect(res.statusCode).toBe(400);
  });

  it('2.15c: missing symptoms field → 400', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  // Auth guards
  it('unauthenticated request to /assess → 401', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .send({ symptoms: 'chest pain and difficulty breathing' });

    expect(res.statusCode).toBe(401);
  });

  it('non-patient trying /assess → 403', async () => {
    const res = await request(app)
      .post('/api/triage/assess')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ symptoms: 'chest pain and difficulty breathing' });

    expect(res.statusCode).toBe(403);
  });
});
