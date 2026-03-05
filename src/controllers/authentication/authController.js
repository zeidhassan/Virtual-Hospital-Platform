const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../../config/db');
require('dotenv').config();

// POST /api/auth/register
exports.registerUser = async (req, res) => {
  const { full_name, email, password, role, phone, gender, date_of_birth } = req.body;

  try {
    // 1. Check if email already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. Insert into users table
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, gender, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, full_name, email, role`,
      [full_name, email, password_hash, role, phone, gender, date_of_birth]
    );

    // 4. Insert into user_passwords table (store plaintext password)
    await pool.query(
      `INSERT INTO user_passwords (email, password) VALUES ($1, $2)`,
      [email, password]
    );

    // 5. Send response
    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // 2. Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 4. Return token and user info
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
};