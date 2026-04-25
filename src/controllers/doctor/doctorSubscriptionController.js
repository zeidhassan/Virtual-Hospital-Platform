const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const mockTxRef = () => `HXC-${uuidv4().split('-')[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

const FPX_BANKS = ['maybank','cimb','public_bank','rhb','hong_leong','ambank','bank_islam','bank_rakyat','bank_muamalat','affin_bank','alliance_bank','ocbc','standard_chartered'];

// GET /doctor/subscriptions/plans
exports.getDoctorPlans = async (req, res) => {
  try {
    const plans = await db.query('SELECT * FROM doctor_plans ORDER BY monthly_price ASC');
    res.status(200).json(plans.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /doctor/subscriptions/subscribe
exports.createDoctorSubscription = async (req, res) => {
  try {
    const { plan_id, billing_cycle, method_type, fpx_bank, payment_method_id, save_card, card_number, cardholder_name, brand, exp_month, exp_year } = req.body;
    const userId = req.user.id;

    if (!plan_id || isNaN(plan_id)) return res.status(400).json({ error: 'Invalid plan_id' });
    if (!['monthly', 'yearly'].includes(billing_cycle)) return res.status(400).json({ error: 'billing_cycle must be monthly or yearly' });
    if (!['card', 'fpx'].includes(method_type)) return res.status(400).json({ error: 'method_type must be card or fpx' });
    if (method_type === 'fpx' && !FPX_BANKS.includes(fpx_bank)) return res.status(400).json({ error: 'Invalid fpx_bank' });

    const planResult = await db.query('SELECT * FROM doctor_plans WHERE id = $1', [plan_id]);
    if (planResult.rowCount === 0) return res.status(404).json({ error: 'Plan not found' });
    const plan = planResult.rows[0];

    // Check for existing active subscription
    const existing = await db.query(
      `SELECT id FROM doctor_subscriptions WHERE user_id = $1 AND status IN ('pending','approved') LIMIT 1`,
      [userId]
    );
    if (existing.rowCount > 0) return res.status(400).json({ error: 'You already have an active subscription' });

    const amount = billing_cycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

    // Save card if requested
    let pmId = payment_method_id ? Number(payment_method_id) : null;
    if (method_type === 'card' && save_card && card_number) {
      const saved = await db.query(
        `INSERT INTO payment_methods (user_id, provider, cardholder_name, brand, last4, exp_month, exp_year, is_default)
         VALUES ($1, 'card', $2, $3, $4, $5, $6, false) RETURNING id`,
        [userId, cardholder_name || '', brand || 'unknown', String(card_number).replace(/\s/g, '').slice(-4), exp_month, exp_year]
      );
      pmId = saved.rows[0].id;
    }

    const txRef = mockTxRef();

    const subResult = await db.query(
      `INSERT INTO doctor_subscriptions (user_id, plan_id, billing_cycle, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [userId, plan_id, billing_cycle]
    );
    const sub = subResult.rows[0];

    await db.query(
      `INSERT INTO payment_transactions (user_id, doctor_subscription_id, amount, method_type, fpx_bank, payment_method_id, transaction_ref, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'success')`,
      [userId, sub.id, amount, method_type, fpx_bank || null, pmId, txRef]
    );

    res.status(201).json({
      success: true,
      subscription: sub,
      transaction_ref: txRef,
      message: 'Subscription submitted — pending admin approval',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /doctor/subscriptions/current
exports.getCurrentDoctorSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT ds.id, ds.plan_id, ds.billing_cycle, ds.status, ds.start_date, ds.end_date, ds.admin_notes,
              dp.name AS plan_name, dp.features, dp.monthly_price, dp.yearly_price, dp.currency
       FROM doctor_subscriptions ds
       JOIN doctor_plans dp ON ds.plan_id = dp.id
       WHERE ds.user_id = $1 AND ds.status IN ('pending', 'approved', 'cancelled', 'rejected')
       ORDER BY ds.created_at DESC LIMIT 1`,
      [userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'No subscription found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /doctor/subscriptions/:id
exports.updateDoctorSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = req.params.id;
    const { new_plan_id, new_billing_cycle, cancel } = req.body;

    const subResult = await db.query(
      `SELECT ds.*, dp.monthly_price, dp.yearly_price
       FROM doctor_subscriptions ds
       JOIN doctor_plans dp ON ds.plan_id = dp.id
       WHERE ds.id = $1 AND ds.user_id = $2 AND ds.status IN ('pending','approved','paid')`,
      [subscriptionId, userId]
    );
    if (subResult.rowCount === 0) return res.status(404).json({ error: 'Active subscription not found' });

    if (cancel) {
      await db.query("UPDATE doctor_subscriptions SET status = 'cancelled' WHERE id = $1", [subscriptionId]);
      return res.status(200).json({ message: 'Subscription cancelled' });
    }

    if (new_plan_id) {
      const planResult = await db.query('SELECT * FROM doctor_plans WHERE id = $1', [new_plan_id]);
      if (planResult.rowCount === 0) return res.status(404).json({ error: 'Plan not found' });
      const cycle = new_billing_cycle || subResult.rows[0].billing_cycle;
      await db.query(
        'UPDATE doctor_subscriptions SET plan_id = $1, billing_cycle = $2, status = $3 WHERE id = $4',
        [new_plan_id, cycle, 'pending', subscriptionId]
      );
      return res.status(200).json({ message: 'Plan change submitted — pending admin approval' });
    }

    res.status(400).json({ error: 'No valid update action provided' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
