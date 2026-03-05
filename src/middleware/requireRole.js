module.exports = (expectedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. No user info provided.' });
    }

    const roles = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires: ${roles.join(', ')}` });
    }

    next();
  };
};
