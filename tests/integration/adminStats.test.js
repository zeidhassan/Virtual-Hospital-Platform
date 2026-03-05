const request = require('supertest');
const app = require('../../src/app');

describe('Admin Stats API Tests', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@virtualhospitalplatform.com',
      password: 'admin123'
    });
    token = res.body.token;
  });

  it('should fetch user counts by role', async () => {
    const res = await request(app)
      .get('/api/admin/stats/users-by-role')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const roles = res.body.map(r => r.role);

    expect(roles).toContain('admin');
    expect(roles).toContain('doctor');
    expect(roles).toContain('patient');
  });
});
