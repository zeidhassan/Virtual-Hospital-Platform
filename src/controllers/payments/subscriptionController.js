const db = require('../../config/db');

// Subscribe to a plan (only one active at a time)
exports.subscribeToPlan = async (req, res) => {
  const { patient_id, plan_id, auto_renew, payment_method, insurance_company, insurance_id_number, start_date, end_date } = req.body;

  if (!patient_id || isNaN(patient_id)) {
    return res.status(400).json({ error: 'Invalid or missing patient_id' });
    }
    if (!plan_id || isNaN(plan_id)) {
    return res.status(400).json({ error: 'Invalid or missing plan_id' });
    }
    if (typeof auto_renew !== 'boolean') {
    return res.status(400).json({ error: 'auto_renew must be true or false' });
  }

  try {
    // 1. Get plan info
    const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planRes.rows[0];

    // 2. Check if patient has an active subscription
    const checkSub = await db.query(
      'SELECT * FROM subscriptions WHERE patient_id = $1 AND NOW() BETWEEN start_date AND end_date',
      [patient_id]
    );
    if (checkSub.rows.length > 0) {
      return res.status(400).json({ error: 'Patient already has an active subscription' });
    }

    // 3. Check if patient is using insurance
    if (payment_method === 'use_insurance') {
      await db.query(`
        INSERT INTO insurance_requests 
          (patient_id, insurance_company, insurance_id_number, start_date, end_date, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
      `, [patient_id, insurance_company, insurance_id_number, start_date, end_date]);

      // Mark new subscription as insurance_pending:
      await db.query(`
        INSERT INTO subscriptions (patient_id, plan_name, start_date, end_date, auto_renew, status)
        VALUES ($1, $2, NOW(), NOW() + INTERVAL '${plan.duration_days} days', $3, 'insurance_pending')
      `, [patient_id, plan.name, auto_renew]);

      return res.status(200).json({ message: 'Insurance request submitted. Waiting for approval.' });
    }

    // 4. Insert subscription
    const result = await db.query(
      `INSERT INTO subscriptions (patient_id, plan_name, start_date, end_date, auto_renew)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '${plan.duration_days} days', $3)
       RETURNING *`,
      [patient_id, plan.name, auto_renew]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// View active subscription for a patient
exports.getActiveSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM subscriptions WHERE patient_id = $1 AND NOW() BETWEEN start_date AND end_date',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cancel or renew an existing subscription
exports.updateSubscription = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    if (action === 'cancel') {
      const result = await db.query(
        'UPDATE subscriptions SET end_date = NOW(), auto_renew = FALSE WHERE id = $1 RETURNING *',
        [id]
      );
      return res.json(result.rows[0]);
    } else if (action === 'renew') {
      const subRes = await db.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
      if (subRes.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });

      const sub = subRes.rows[0];
      const planRes = await db.query('SELECT * FROM plans WHERE name = $1', [sub.plan_name]);
      const plan = planRes.rows[0];
      const result = await db.query(
        `UPDATE subscriptions
         SET end_date = end_date + INTERVAL '${plan.duration_days} days', auto_renew = TRUE
         WHERE id = $1 RETURNING *`,
        [id]
      );
      return res.json(result.rows[0]);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Auto-renew logic (for CRON job)
exports.autoRenewSubscriptions = async (req, res) => {
  try {
    const renewed = await db.query(
      `UPDATE subscriptions
       SET end_date = end_date + INTERVAL '30 days'
       WHERE auto_renew = TRUE
       AND end_date < NOW()
       RETURNING *`
    );
    res.json({ renewed_count: renewed.rowCount, renewed_subs: renewed.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
