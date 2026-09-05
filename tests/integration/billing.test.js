const request = require('supertest');
const app = require('../../src/app');

describe('Billing API Tests', () => {
  let adminToken, doctorToken, patientToken;
  let createdBillId;

  beforeAll(async () => {
    const loginAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@helixacare.com',
      password: 'admin123'
    });
    adminToken = loginAdmin.body.token;

    const loginDoctor = await request(app).post('/api/auth/login').send({
      email: 'strange@helixacare.com',
      password: 'admin123'
    });
    doctorToken = loginDoctor.body.token;

    const loginPatient = await request(app).post('/api/auth/login').send({
      email: 'jane@helixacare.com',
      password: 'admin123'
    });
    patientToken = loginPatient.body.token;
  });

  it('should allow admin to create a bill', async () => {
    const res = await request(app)
      .post('/api/payments/bills')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patient_id: 1,
        amount: 199.99,
        details: 'Lab test and consultation'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdBillId = res.body.id;
  });

  it('should allow patient to view their own bills', async () => {
    const res = await request(app)
      .get('/api/payments/bills/my')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should allow doctor to update bill status', async () => {
    const res = await request(app)
      .put(`/api/payments/bills/${createdBillId}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'paid' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('paid');
  });

  it('should prevent patient from deleting a bill', async () => {
    const res = await request(app)
      .delete(`/api/payments/bills/${createdBillId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('should allow admin to delete the bill', async () => {
    const res = await request(app)
      .delete(`/api/payments/bills/${createdBillId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
