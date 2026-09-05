// middleware/rateLimit.js

const rateLimit = require('express-rate-limit');

// Strict: Login endpoint
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Max 5 attempts per IP
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // disable in test env so account-lockout tests aren't blocked
});

// Moderate: OTP requests
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: { error: 'Too many OTP requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API traffic limit
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // disable in test env — the suite makes far more than 300 requests per run
});

// Triage assess endpoint — strict to prevent abuse
const triageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many triage requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = {
  loginLimiter,
  otpLimiter,
  generalApiLimiter,
  triageLimiter,
};
