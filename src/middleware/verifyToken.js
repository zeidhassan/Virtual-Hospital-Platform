const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const secret = process.env.JWT_SECRET;

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

    // Opportunistic cleanup — a blacklist row is dead weight once its own
    // token would have expired anyway. Throttled so this isn't a write on
    // every single request.
    if (Math.random() < 0.01) {
      pool.query('DELETE FROM token_blacklist WHERE exp IS NOT NULL AND exp < NOW()').catch((err) => {
        console.error('[Auth] token_blacklist cleanup failed:', err);
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('[Auth] Token invalid:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};
