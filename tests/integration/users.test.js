const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('User Management API Tests (Basic User Table Only)', () => {
  let token;
  const testEmail = `testuser${Date.now()}@helixacare.com`;

  it('should register a new patient', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test User',
        email: testEmail,
        password: 'test1234',
        role: 'patient',
        phone: '0123456789',
        gender: 'female',
        date_of_birth: '1995-04-10'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.user).toHaveProperty('id');
  });

  it('should log in the new user and return a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'test1234'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('should return the logged-in user profile (basic fields only)', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('email', testEmail);
    expect(res.body).toHaveProperty('full_name', 'Test User');
    expect(res.body).toHaveProperty('role', 'patient');
    // Registration now creates a matching patients row for every new
    // account, so a freshly-registered patient's own profile correctly
    // includes their (still-empty) patient fields.
    expect(res.body).toHaveProperty('blood_group', null);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM patients WHERE user_id = (SELECT id FROM users WHERE email = $1)', [testEmail]);
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
  });
});
