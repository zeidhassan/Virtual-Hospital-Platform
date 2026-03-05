const db = require('../../config/db');

exports.handleWebhook = async (req, res) => {
  const { bill_id, patient_id, plan_name, auto_renew, duration_days } = req.body;

  if (!bill_id || !patient_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Mark bill as paid
    await db.query('UPDATE bills SET status = $1 WHERE id = $2', ['paid', bill_id]);

    // 2. Optionally add subscription
    if (plan_name) {
      const duration = duration_days || 180; // default: 180 days
      await db.query(
        `INSERT INTO subscriptions (patient_id, plan_name, start_date, end_date, auto_renew)
         VALUES ($1, $2, NOW(), NOW() + INTERVAL '${duration} days', $3)`,
        [patient_id, plan_name, auto_renew]
      );
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).json({ error: err.message });
  }
};
