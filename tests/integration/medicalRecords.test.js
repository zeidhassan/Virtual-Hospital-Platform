const request = require('supertest');
const path = require('path');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Medical Records API Tests', () => {
  let doctorToken, patientToken, recordId, appointmentId, patientId;

  beforeAll(async () => {
    const doctorLogin = await request(app).post('/api/auth/login').send({
      email: 'strange@helixacare.com',
      password: 'admin123'
    });
    doctorToken = doctorLogin.body.token;

    const patientLogin = await request(app).post('/api/auth/login').send({
      email: 'jane@helixacare.com',
      password: 'admin123'
    });
    patientToken = patientLogin.body.token;

    const apptRes = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, status)
       VALUES (1, 1, CURRENT_DATE, '09:00', '10:00', 'completed') RETURNING id`
    );
    appointmentId = apptRes.rows[0].id;
    patientId = 1;
  });

  afterAll(async () => {
    if (recordId) {
      await pool.query('DELETE FROM medical_records WHERE id = $1', [recordId]);
    }
    await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
  });

  it('should allow doctor to upload a medical record for a linked patient', async () => {
    const res = await request(app)
      .post(`/api/doctor/patients/${patientId}/records`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .field('appointment_id', appointmentId)
      .field('record_type', 'xray')
      .field('description', 'Test upload via integration test')
      .attach('medical_record_file', path.join(__dirname, '../__mocks__/testfile.pdf'));

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('file_url');
    recordId = res.body.data.id;
  });

  it('should prevent patient from deleting the uploaded record', async () => {
    const res = await request(app)
      .delete(`/api/medical-records/${recordId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('should allow doctor to delete the uploaded medical record', async () => {
    const res = await request(app)
      .delete(`/api/medical-records/${recordId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
    recordId = null;
  });
});
