const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../../config/db');
require('dotenv').config();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// POST /api/auth/register — public self-registration is patient-only
// (enforced by validateRegister in the route); doctor and admin accounts are
// created by an admin via usersController.createUser instead.
exports.registerUser = async (req, res) => {
  const { full_name, email, password, phone, gender, date_of_birth } = req.body;
  const role = 'patient';

  const client = await pool.connect();
  try {
    // 1. Check if email already exists
    const existing = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await client.query('BEGIN');

    // 3. Insert into users table
    const result = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, gender, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, full_name, email, role`,
      [full_name, email, password_hash, role, phone, gender, date_of_birth]
    );
    const user = result.rows[0];

    // 4. Every patient account needs a matching patients row so the rest of
    // the app (which keys everything off patients.id, not users.id) works
    // immediately — the patient fills in blood group, allergies, etc. later
    // via their profile.
    await client.query('INSERT INTO patients (user_id) VALUES ($1)', [user.id]);

    await client.query('COMMIT');

    // 5. Send response
    res.status(201).json({
      message: 'User registered successfully',
      user
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  } finally {
    client.release();
  }
};

// POST /api/auth/login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Look up user by email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account locked due to too many failed login attempts. Try again in 30 minutes.' });
    }

    // 3. Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const newAttempts = (user.login_attempts || 0) + 1;
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await pool.query(
          'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newAttempts, lockUntil, user.id]
        );
        return res.status(423).json({ error: 'Account locked after too many failed login attempts. Try again in 30 minutes.' });
      }
      await pool.query(
        'UPDATE users SET login_attempts = $1 WHERE id = $2',
        [newAttempts, user.id]
      );
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 4. Reset failed attempts on successful login
    await pool.query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    // 5. Generate JWT with jti for blacklisting support
    const jti = uuidv4();
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, jti },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 6. Look up role-specific profile ID
    let roleId = {};
    if (user.role === 'patient') {
      const patRow = await pool.query('SELECT id FROM patients WHERE user_id = $1', [user.id]);
      if (patRow.rows.length > 0) roleId = { patientId: patRow.rows[0].id };
    } else if (user.role === 'doctor') {
      const docRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [user.id]);
      if (docRow.rows.length > 0) roleId = { doctorId: docRow.rows[0].id };
    }

    // 7. Return token and user info
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
        ...roleId,
      }
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /api/auth/logout
exports.logoutUser = async (req, res) => {
  try {
    const { jti, id: userId, exp } = req.user;
    if (!jti) {
      // Token has no jti (legacy token) — just acknowledge logout
      return res.json({ message: 'Logged out successfully' });
    }
    // exp is the JWT's own expiry (seconds since epoch) — once that time
    // passes the token would be rejected as expired anyway, so the
    // blacklist row is only ever needed up until then.
    const expiresAt = exp ? new Date(exp * 1000) : null;
    await pool.query(
      'INSERT INTO token_blacklist (jti, user_id, exp) VALUES ($1, $2, $3) ON CONFLICT (jti) DO NOTHING',
      [jti, userId, expiresAt]
    );
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[LOGOUT ERROR]', err.message);
    res.status(500).json({ error: 'Logout failed' });
  }
};