const request = require('supertest');
const app = require('../../src/app');

describe('Auth Integration Tests', () => {
  let token;

  it('should login with seeded patient account', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'jane@virtualhospitalplatform.com',
      password: 'patient123'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('should get user profile using JWT', async () => {
    const res = await request(app)
      .get('/api/auth/profile') // fixed path
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('email', 'jane@virtualhospitalplatform.com');
    expect(res.body).toHaveProperty('role', 'patient');
  });
});
