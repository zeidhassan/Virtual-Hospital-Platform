const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const secret = process.env.JWT_SECRET || 'your-secret-key';

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, secret);

    // Check token blacklist (logout support)
    if (decoded.jti) {
      const blacklisted = await pool.query(
        'SELECT 1 FROM token_blacklist WHERE jti = $1',
        [decoded.jti]
      );
      if (blacklisted.rowCount > 0) {
        return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('[Auth] Token invalid:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};
