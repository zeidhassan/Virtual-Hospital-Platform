const request = require('supertest');
const app = require('../../src/app');

describe('Pharmacy Orders Integration Tests', () => {
  let token;

  beforeAll(async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'jane@virtualhospitalplatform.com', // Patient user
      password: 'patient123'
    });
    token = login.body.token;
  });

  it('should place a pharmacy order with a prescription', async () => {
    const res = await request(app)
      .post('/api/pharmacy-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        medications: ['Paracetamol', 'Ibuprofen']
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});
