const request = require('supertest');
const path = require('path');
const app = require('../../src/app');

describe('Medical Records API Tests', () => {
  let doctorToken, patientToken, recordId;

  beforeAll(async () => {
    const doctorLogin = await request(app).post('/api/auth/login').send({
      email: 'strange@virtualhospitalplatform.com',
      password: 'doctor123'
    });
    doctorToken = doctorLogin.body.token;

    const patientLogin = await request(app).post('/api/auth/login').send({
      email: 'jane@virtualhospitalplatform.com',
      password: 'patient123'
    });
    patientToken = patientLogin.body.token;
  });

  it('should allow doctor to upload a medical record', async () => {
    const res = await request(app)
      .post('/api/upload/medical-record')
      .set('Authorization', `Bearer ${doctorToken}`)
      .field('patient_id', 1)
      .field('record_type', 'X-ray')
      .field('description', 'Test upload via integration test')
      .attach('file', path.join(__dirname, '../__mocks__/testfile.pdf'));

    expect(res.statusCode).toBe(201);
    expect(res.body.record).toHaveProperty('id');
    expect(res.body.record).toHaveProperty('file_url');
    recordId = res.body.record.id;
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
  });
});
