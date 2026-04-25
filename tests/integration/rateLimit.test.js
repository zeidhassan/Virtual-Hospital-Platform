const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');

// Create fresh local limiter instances (same config as production, but no test-env skip)
// so this suite verifies the rate-limit logic independently.
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, max: 5,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 3,
  message: { error: 'Too many OTP requests. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
const triageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many triage requests. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

const app = express();
app.use(express.json());

app.get('/login', loginLimiter, (req, res) => res.send('OK'));
app.get('/otp', otpLimiter, (req, res) => res.send('OK'));
app.get('/api', generalApiLimiter, (req, res) => res.send('OK'));
app.get('/triage', triageLimiter, (req, res) => res.send('OK'));

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

  test('triageLimiter should block after 10 requests', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get('/triage');
    }
    const res = await request(app).get('/triage');
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/too many triage requests/i);
  });
});
