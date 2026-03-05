const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const authController = require('../../controllers/authentication/authController');
const { loginLimiter } = require('../../middleware/rateLimit');

const frontendUrl = process.env.FRONTEND_URL;

// Register limiter
const registerLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Too many registration attempts, try again later.' }
});

// Validation middleware
const validateRegister = [
  body('full_name').trim().isLength({ min: 3 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'doctor', 'patient']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists().isLength({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// @route   POST /api/auth/register
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, doctor, patient]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Email already exists or invalid input
 */
router.post('/register', validateRegister, registerLimiter, authController.registerUser);

// @route   POST /api/auth/login
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateLogin, loginLimiter, authController.loginUser);

// GOOGLE LOGIN
/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Google OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirects to Google login
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET);

    let redirectUrl = `${frontendUrl}/login-callback/google?token=${token}`;

    res.redirect(redirectUrl);
  }
);

// FACEBOOK LOGIN
/**
 * @swagger
 * /api/auth/facebook:
 *   get:
 *     summary: Facebook OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirects to Facebook login
 */
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login.html' }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET);

    let redirectUrl = `${frontendUrl}/login-callback/facebook?token=${token}`;

    res.redirect(redirectUrl);
  }
);

module.exports = router;
