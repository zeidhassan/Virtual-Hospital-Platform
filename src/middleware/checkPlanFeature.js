// src/middleware/checkPlanFeature.js

const db = require('../config/db');

const checkPlanFeature = (requiredFeature, expectedValue = true) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // 1) Find active, paid doctor subscription
      const subResult = await db.query(
        `SELECT ds.*, dp.features
         FROM doctor_subscriptions ds
         JOIN doctor_plans dp ON ds.plan_id = dp.id
         WHERE ds.user_id = $1 AND ds.status = 'paid'
         ORDER BY ds.created_at DESC LIMIT 1`,
        [userId]
      );

      if (subResult.rowCount === 0) {
        return res.status(403).json({ error: 'No active doctor subscription found. Upgrade required.' });
      }

      const planFeatures = subResult.rows[0].features;

      // 2) Check the required feature
      const actualValue = planFeatures[requiredFeature];

      const isAllowed = (typeof expectedValue === 'boolean')
        ? actualValue === expectedValue
        : actualValue === expectedValue;

      if (!isAllowed) {
        return res.status(403).json({
          error: `Upgrade required: this feature (${requiredFeature}) is not included in your plan.`
        });
      }

      // 3) All good
      next();

    } catch (err) {
      console.error('Plan Feature Middleware Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = checkPlanFeature;
