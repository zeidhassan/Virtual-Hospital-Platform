const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'your-secret-key';

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[Auth] Token invalid:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};
