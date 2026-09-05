const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Auth Lockout & Logout Integration Tests', () => {
  const testEmail = 'jane@helixacare.com';
  const correctPassword = 'admin123';
  const wrongPassword = 'wrongpassword';

  // Reset account state after each test so tests are independent
  afterEach(async () => {
    await pool.query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE email = $1',
      [testEmail]
    );
  });

  describe('1.9 / 1.10 / 1.11 — Account lockout', () => {
    it('should return 401 on wrong password when not locked', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: wrongPassword
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 423 on the 5th failed attempt (account locks)', async () => {
      // Pre-seed: 4 previous failed attempts in DB
      await pool.query(
        'UPDATE users SET login_attempts = 4 WHERE email = $1',
        [testEmail]
      );
      // 5th attempt (wrong) → triggers lockout → 423
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: wrongPassword
      });
      expect(res.statusCode).toBe(423);
      expect(res.body.error).toMatch(/locked/i);
    });

    it('should return 423 immediately when account is already locked (1.9)', async () => {
      // Manually lock the account
      await pool.query(
        "UPDATE users SET login_attempts = 5, locked_until = NOW() + INTERVAL '30 minutes' WHERE email = $1",
        [testEmail]
      );
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: correctPassword
      });
      expect(res.statusCode).toBe(423);
      expect(res.body.error).toMatch(/locked/i);
    });

    it('should allow login after lockout period expires (1.10)', async () => {
      // Set locked_until to the past (already expired)
      await pool.query(
        "UPDATE users SET login_attempts = 5, locked_until = NOW() - INTERVAL '1 minute' WHERE email = $1",
        [testEmail]
      );
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: correctPassword
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should reset failed attempt counter after successful login (1.11)', async () => {
      // Pre-seed 3 prior failures
      await pool.query(
        'UPDATE users SET login_attempts = 3 WHERE email = $1',
        [testEmail]
      );
      // Successful login
      await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: correctPassword
      });
      // Verify DB reset
      const { rows } = await pool.query(
        'SELECT login_attempts, locked_until FROM users WHERE email = $1',
        [testEmail]
      );
      expect(rows[0].login_attempts).toBe(0);
      expect(rows[0].locked_until).toBeNull();
    });
  });

  describe('1.12 / 1.13 — JWT logout and blacklisting', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: correctPassword
      });
      token = res.body.token;
    });

    it('should logout successfully and blacklist the token (1.12)', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/logged out/i);
    });

    it('should reject a blacklisted token on any protected route (1.13)', async () => {
      // Logout first
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Same token should now be rejected
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/revoked/i);
    });

    it('should return 401 when no token is provided on a protected route (1.5)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });
  });
});
