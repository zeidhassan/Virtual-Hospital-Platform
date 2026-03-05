// src/controllers/doctorSubscriptionController.js

const db = require('../../config/db'); 
const paypalClient = require('../../utils/paypalClient');
const { v4: uuidv4 } = require('uuid');

// 1) Get all doctor plans
exports.getDoctorPlans = async (req, res) => {
  try {
    const plans = await db.query('SELECT * FROM doctor_plans');
    res.status(200).json(plans.rows);
  } catch (err) {
    console.error('Error fetching doctor plans:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2) Subscribe to a doctor plan: create PayPal order
exports.createDoctorSubscription = async (req, res) => {
  try {
    const { plan_id, billing_cycle, paperwork_url } = req.body;
    const user_id = req.user.id; // Assuming JWT decoded user is attached

    // Validate plan
    const planResult = await db.query('SELECT * FROM doctor_plans WHERE id = $1', [plan_id]);
    if (planResult.rowCount === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planResult.rows[0];
    const amount = billing_cycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
/*
    // Create PayPal order
    const request = new paypalClient.client();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: uuidv4(),
        amount: {
          currency_code: plan.currency || 'SAR',
          value: amount.toString()
        },
        description: `Doctor Plan: ${plan.name} (${billing_cycle})`
      }]
    });

    const order = await paypalClient.client().execute(request);
*/
    // Create local subscription record with pending status
    await db.query(`
      INSERT INTO doctor_subscriptions (user_id, plan_id, billing_cycle, paperwork_url, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [user_id, plan_id, billing_cycle, paperwork_url, 'pending']);

    res.status(201).json({
      //id: order.result.id,
      //status: "order.result.status",
      //links: order.result.links
    });
  } catch (err) {
    console.error('Error creating doctor subscription:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3) Webhook handler (simplified)
exports.handleDoctorPaypalWebhook = async (req, res) => {
  try {
    const event = req.body;

    // Extract reference_id (subscription_id) from PayPal event
    const referenceId = event?.resource?.purchase_units?.[0]?.reference_id;

    if (!referenceId) {
      return res.status(400).json({ error: 'Missing reference_id' });
    }

    // Mark as paid
    await db.query(
      `UPDATE doctor_subscriptions SET status = 'paid' WHERE id = $1`,
      [referenceId]
    );

    res.status(200).json({ message: 'Doctor webhook processed successfully' });

  } catch (err) {
    console.error('Doctor Webhook Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 4) Get current doctor subscription details
exports.getCurrentDoctorSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(`
      SELECT ds.id, ds.plan_id, ds.billing_cycle, ds.status, ds.start_date, ds.end_date,
             dp.name AS plan_name, dp.features, dp.monthly_price, dp.yearly_price
      FROM doctor_subscriptions ds
      JOIN doctor_plans dp ON ds.plan_id = dp.id
      WHERE ds.user_id = $1 AND ds.status IN ('pending', 'approved')
      ORDER BY ds.created_at DESC LIMIT 1
    `, [userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No active doctor subscription found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching doctor subscription:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 5) Update doctor subscription (change plan or cancel)
exports.updateDoctorSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = req.params.id;
    const { new_plan_id, new_billing_cycle, cancel } = req.body;

    // 1️⃣ Get current subscription
    const subResult = await db.query(`
      SELECT ds.*, dp.monthly_price AS current_monthly, dp.yearly_price AS current_yearly
      FROM doctor_subscriptions ds
      JOIN doctor_plans dp ON ds.plan_id = dp.id
      WHERE ds.id = $1 AND ds.user_id = $2 AND ds.status = 'paid'
    `, [subscriptionId, userId]);

    if (subResult.rowCount === 0) {
      return res.status(404).json({ error: 'Active subscription not found.' });
    }

    const currentSub = subResult.rows[0];
    const cycle = new_billing_cycle || currentSub.billing_cycle;

    if (cancel) {
      // ✅ Cancel renewal
      await db.query(`UPDATE doctor_subscriptions SET status = 'cancelled' WHERE id = $1`, [subscriptionId]);
      return res.status(200).json({ message: 'Subscription cancelled.' });
    }

    if (new_plan_id) {
      // 2️⃣ Validate new plan
      const planResult = await db.query(`SELECT * FROM doctor_plans WHERE id = $1`, [new_plan_id]);
      if (planResult.rowCount === 0) {
        return res.status(404).json({ error: 'New plan not found.' });
      }

      const newPlan = planResult.rows[0];
      const newPrice = cycle === 'yearly' ? newPlan.yearly_price : newPlan.monthly_price;
      const currentPrice = cycle === 'yearly' ? currentSub.current_yearly : currentSub.current_monthly;

      if (newPrice === currentPrice) {
        return res.status(400).json({ error: 'Selected plan has same price.' });
      }

      if (newPrice > currentPrice) {
        // ✅ UPGRADE: Pay the difference immediately
        const priceDifference = newPrice - currentPrice;

        // Create PayPal order for the difference
        const request = new paypalClient.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        request.requestBody({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: newPlan.currency || 'SAR',
              value: priceDifference.toFixed(2)
            },
            description: `Upgrade to ${newPlan.name} (${cycle})`
          }]
        });

        const order = await paypalClient.client().execute(request);

        // Store intent to switch plans after payment confirmed
        await db.query(`
          UPDATE doctor_subscriptions 
          SET status = 'upgrade_pending', plan_id = $1, billing_cycle = $2
          WHERE id = $3
        `, [new_plan_id, cycle, subscriptionId]);

        return res.status(200).json({
          message: `Upgrade requested. Pay SAR ${priceDifference.toFixed(2)} to activate.`,
          paypal_order_id: order.result.id,
          paypal_links: order.result.links
        });

      } else {
        // ✅ DOWNGRADE: no refund, mark plan to switch on next cycle
        await db.query(`
          UPDATE doctor_subscriptions 
          SET status = 'downgrade_scheduled', plan_id = $1, billing_cycle = $2
          WHERE id = $3
        `, [new_plan_id, cycle, subscriptionId]);

        return res.status(200).json({
          message: `Downgrade scheduled. It will take effect after your current billing cycle ends.`
        });
      }
    }

    res.status(400).json({ error: 'No valid update action provided.' });

  } catch (err) {
    console.error('Error updating doctor subscription:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
