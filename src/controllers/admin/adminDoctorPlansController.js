// src/controllers/admin/adminDoctorPlansController.js

const db = require('../../config/db');

// 1) View all doctor subscription requests with enriched doctor profile info
exports.getDoctorsByPlan = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id AS user_id,
        u.full_name AS full_name,
        u.email,
        u.phone,
        u.gender,
        u.date_of_birth,

        d.specialization,
        d.qualifications,
        d.availability_status,
        d.profile_picture_url,
        d.bio,

        ds.id AS subscription_id,
        ds.plan_id,
        dp.name AS plan_name,
        ds.billing_cycle,
        ds.status,
        ds.paperwork_url,
        ds.start_date,
        ds.end_date,
        ds.admin_notes,
        ds.created_at,
        ds.updated_at

      FROM doctor_subscriptions ds
      JOIN doctor_plans dp ON ds.plan_id = dp.id
      JOIN users u ON ds.user_id = u.id
      LEFT JOIN doctors d ON d.user_id = u.id
      
      WHERE ds.status IN ('approved', 'pending', 'rejected')
      ORDER BY ds.status DESC, ds.created_at DESC
    `);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Admin getDoctorsByPlan Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2) Admin modifies plan features
exports.updateDoctorPlan = async (req, res) => {
  try {
    const planId = req.params.id;
    const { name, monthly_price, yearly_price, features } = req.body;

    await db.query(
      `UPDATE doctor_plans 
       SET name = $1, monthly_price = $2, yearly_price = $3, features = $4
       WHERE id = $5`,
      [name, monthly_price, yearly_price, features, planId]
    );

    res.status(200).json({ message: 'Doctor plan updated successfully.' });

  } catch (err) {
    console.error('Admin updateDoctorPlan Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3) Real-time subscription usage stats
exports.getSubscriptionStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        dp.id AS plan_id,
        dp.name AS plan_name,
        COUNT(ds.id) AS total_subscriptions,
        SUM(CASE WHEN ds.status = 'paid' THEN 1 ELSE 0 END) AS active_subscriptions,
        SUM(CASE WHEN ds.status = 'upgrade_pending' THEN 1 ELSE 0 END) AS upgrades_pending,
        SUM(CASE WHEN ds.status = 'downgrade_scheduled' THEN 1 ELSE 0 END) AS downgrades_scheduled
      FROM doctor_plans dp
      LEFT JOIN doctor_subscriptions ds ON dp.id = ds.plan_id
      GROUP BY dp.id, dp.name
      ORDER BY dp.id
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Admin getSubscriptionStats Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
