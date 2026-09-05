const request = require('supertest');
const path = require('path');
const app = require('../../src/app');
const pool = require('../../src/config/db');

const MOCK_FILE = path.join(__dirname, '../__mocks__/testfile.pdf');

// Cross-tenant authorization suite — asserts that a caller can never reach
// another user's data through a resource-scoped endpoint, regardless of
// role. Patient A / Doctor A are the seeded, linked pair everything else in
// this suite uses; Patient B and Doctor B are resolved so they are
// genuinely unrelated to Patient A, without hardcoding which seeded account
// that is (the dev and test databases don't seed the same doctors).
describe('Cross-Tenant Authorization', () => {
  let patientAToken, patientBToken, doctorAToken, doctorBToken;
  let patientAId, doctorAId;
  let patientBUserId;

  beforeAll(async () => {
    const [doctorARes, patientARes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'admin123' }),
    ]);
    doctorAToken = doctorARes.body.token;
    patientAToken = patientARes.body.token;

    const patientARow = await pool.query(
      "SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'jane@helixacare.com'"
    );
    patientAId = patientARow.rows[0].id;

    const doctorARow = await pool.query(
      "SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id WHERE u.email = 'strange@helixacare.com'"
    );
    doctorAId = doctorARow.rows[0].id;

    // A doctor with no appointment history with Patient A — resolved
    // dynamically since which seeded doctor that is differs between the
    // dev and test databases.
    const doctorBRow = await pool.query(
      `SELECT d.id, u.email FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.id NOT IN (
         SELECT DISTINCT doctor_id FROM appointments WHERE patient_id = $1 AND doctor_id IS NOT NULL
       )
       LIMIT 1`,
      [patientAId]
    );
    const doctorBLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: doctorBRow.rows[0].email, password: 'admin123' });
    doctorBToken = doctorBLogin.body.token;

    // A second patient, registered fresh so this suite doesn't depend on
    // which other patients happen to be seeded.
    // Lowercase — the register endpoint normalizes email case, so a mixed-case
    // literal here would no longer match what's actually stored.
    const patientBEmail = `authz_patientb_${Date.now()}@helixacare.com`;
    await request(app).post('/api/auth/register').send({
      full_name: 'Authz Test Patient B',
      email: patientBEmail,
      password: 'testpass123',
      role: 'patient',
    });
    const patientBLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: patientBEmail, password: 'testpass123' });
    patientBToken = patientBLogin.body.token;

    const patientBRow = await pool.query('SELECT id FROM users WHERE email = $1', [patientBEmail]);
    patientBUserId = patientBRow.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM patients WHERE user_id = $1', [patientBUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [patientBUserId]);
  });

  describe('Medical record files (/api/files/medical-records/:filename)', () => {
    let filename, recordId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientAToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'authz test record')
        .attach('medical_record_file', MOCK_FILE);
      recordId = res.body.data.id;
      filename = res.body.data.file_url.split('/').pop();
    });

    afterAll(async () => {
      if (recordId) await pool.query('DELETE FROM medical_records WHERE id = $1', [recordId]);
    });

    it('allows the owning patient to read it', async () => {
      const res = await request(app)
        .get(`/api/files/medical-records/${filename}`)
        .set('Authorization', `Bearer ${patientAToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('blocks a different patient from reading it', async () => {
      const res = await request(app)
        .get(`/api/files/medical-records/${filename}`)
        .set('Authorization', `Bearer ${patientBToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('blocks a doctor with no appointment link to the owning patient', async () => {
      const res = await request(app)
        .get(`/api/files/medical-records/${filename}`)
        .set('Authorization', `Bearer ${doctorBToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('requires authentication', async () => {
      const res = await request(app).get(`/api/files/medical-records/${filename}`);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Doctor patient detail (/api/doctor/patients/:patientId)', () => {
    it('blocks a doctor with no appointment history with the patient', async () => {
      const res = await request(app)
        .get(`/api/doctor/patients/${patientAId}`)
        .set('Authorization', `Bearer ${doctorBToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('allows a linked doctor to view the patient', async () => {
      const res = await request(app)
        .get(`/api/doctor/patients/${patientAId}`)
        .set('Authorization', `Bearer ${doctorAToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Patient health logs (/api/health-logs/patient/:patientId)", () => {
    it("blocks a doctor with no appointment history from reading a patient's health logs", async () => {
      const res = await request(app)
        .get(`/api/health-logs/patient/${patientAId}`)
        .set('Authorization', `Bearer ${doctorBToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Consultation history (/api/consultation-history/patient/:patientId)', () => {
    it('blocks an unrelated doctor from viewing a timeline', async () => {
      const res = await request(app)
        .get(`/api/consultation-history/patient/${patientAId}`)
        .set('Authorization', `Bearer ${doctorBToken}`);
      expect(res.statusCode).toBe(403);
    });

    it("blocks an unrelated patient from viewing another patient's timeline", async () => {
      const res = await request(app)
        .get(`/api/consultation-history/patient/${patientAId}`)
        .set('Authorization', `Bearer ${patientBToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Medical record edit/delete (/api/doctor/records/:id, /api/medical-records/:id)', () => {
    let recordId, appointmentId;

    beforeAll(async () => {
      const apptRes = await pool.query(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, status)
         VALUES ($1, $2, CURRENT_DATE, '09:00', '10:00', 'completed') RETURNING id`,
        [patientAId, doctorAId]
      );
      appointmentId = apptRes.rows[0].id;

      const res = await request(app)
        .post(`/api/doctor/patients/${patientAId}/records`)
        .set('Authorization', `Bearer ${doctorAToken}`)
        .field('appointment_id', appointmentId)
        .field('record_type', 'doctor-notes')
        .field('description', 'authz edit/delete test')
        .attach('medical_record_file', MOCK_FILE);
      recordId = res.body.data.id;
    });

    afterAll(async () => {
      if (recordId) await pool.query('DELETE FROM medical_records WHERE id = $1', [recordId]);
      if (appointmentId) await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
    });

    it('blocks a doctor who did not create the record from editing it', async () => {
      const res = await request(app)
        .put(`/api/doctor/records/${recordId}`)
        .set('Authorization', `Bearer ${doctorBToken}`)
        .send({ record_type: 'scan', description: 'hijacked' });
      expect(res.statusCode).toBe(403);
    });

    it('allows the creating doctor to edit it', async () => {
      const res = await request(app)
        .put(`/api/doctor/records/${recordId}`)
        .set('Authorization', `Bearer ${doctorAToken}`)
        .send({ record_type: 'doctor-notes', description: 'edited by owner' });
      expect(res.statusCode).toBe(200);
    });

    it('blocks a doctor who did not create the record from deleting it', async () => {
      const res = await request(app)
        .delete(`/api/medical-records/${recordId}`)
        .set('Authorization', `Bearer ${doctorBToken}`);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Prescription edit (/api/doctor/prescriptions/:id)', () => {
    let prescriptionId, appointmentId;

    beforeAll(async () => {
      const apptRes = await pool.query(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, status)
         VALUES ($1, $2, CURRENT_DATE, '09:00', '10:00', 'completed') RETURNING id`,
        [patientAId, doctorAId]
      );
      appointmentId = apptRes.rows[0].id;

      const medRow = await pool.query('SELECT id FROM medications LIMIT 1');
      const medicationId = medRow.rows[0].id;

      const res = await request(app)
        .post(`/api/doctor/appointments/${appointmentId}/prescriptions`)
        .set('Authorization', `Bearer ${doctorAToken}`)
        .send({ medication_id: medicationId, dosage: '1 tablet', pack_limit: 1, instructions: 'authz test', issued_date: new Date().toISOString().slice(0, 10) });
      prescriptionId = res.body.data.id;
    });

    afterAll(async () => {
      if (prescriptionId) await pool.query('DELETE FROM prescriptions WHERE id = $1', [prescriptionId]);
      if (appointmentId) await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
    });

    it('blocks a doctor who did not write the prescription from editing it', async () => {
      const res = await request(app)
        .put(`/api/doctor/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${doctorBToken}`)
        .send({ dosage: 'hijacked' });
      expect(res.statusCode).toBe(403);
    });

    it('allows the prescribing doctor to edit it', async () => {
      const res = await request(app)
        .put(`/api/doctor/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${doctorAToken}`)
        .send({ dosage: '2 tablets', pack_limit: 1, instructions: 'updated', limit_reached: false });
      expect(res.statusCode).toBe(200);
    });
  });
});
