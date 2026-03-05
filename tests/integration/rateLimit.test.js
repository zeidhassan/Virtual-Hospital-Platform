const express = require('express');
const request = require('supertest');
const { loginLimiter, otpLimiter, generalApiLimiter } = require('../../src/middleware/rateLimit');

const app = express();
app.use(express.json());

app.get('/login', loginLimiter, (req, res) => res.send('OK'));
app.get('/otp', otpLimiter, (req, res) => res.send('OK'));
app.get('/api', generalApiLimiter, (req, res) => res.send('OK'));

describe('Rate Limiters', () => {
  test('loginLimiter should block after 5 requests', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).get('/login');
    }
    const res = await request(app).get('/login');
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/too many login attempts/i);
  });

  test('otpLimiter should block after 3 requests', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).get('/otp');
    }
    const res = await request(app).get('/otp');
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/too many otp requests/i);
  });

  test('generalApiLimiter should block after 100 requests', async () => {
    for (let i = 0; i < 100; i++) {
      await request(app).get('/api');
    }
    const res = await request(app).get('/api');
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/too many requests/i);
  });
});
