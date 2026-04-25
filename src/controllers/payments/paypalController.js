const axios = require('axios');
const pool = require('../../config/db');

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const res = await axios({
    method: 'post',
    url: `${PAYPAL_API_BASE}/v1/oauth2/token`,
    auth: { username: id, password: secret },
    params: { grant_type: 'client_credentials' }
  });
  return res.data.access_token;
}

// POST /api/payments/paypal/create-order
// Body: { amount: "10.00", currency_code: "USD", description?: string }
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // IMPORTANT: Do not trust client price in real apps.
    // Pull/compute amount server-side from your plans/cart.
    const amount = String(req.body?.amount || '10.00');
    const currency = (req.body?.currency_code || process.env.PAYPAL_CURRENCY || 'USD').toUpperCase();
    const description = req.body?.description || 'HelixaCare payment';

    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      return res.status(400).json({ error: 'Invalid amount format' });
    }

    const accessToken = await getAccessToken();

    const createRes = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: currency, value: amount },
            description
          }
        ],
        application_context: {
          shipping_preference: 'NO_SHIPPING' // adjust if you need shipping
        }
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Return the PayPal order ID to the client (for the JS SDK to approve)
    return res.json({ id: createRes.data.id, status: createRes.data.status });
  } catch (err) {
    console.error('[PayPal createOrder] Error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create PayPal order' });
  }
};

// POST /api/payments/paypal/capture-order/:orderId?makeDefault=1
// After buyer approves in the popup, the client calls this to capture.
// On success, we upsert a PayPal payment method for this user.
exports.captureOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const orderId = req.params.orderId;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const makeDefault = ['1','true','yes','on'].includes(String(req.query.makeDefault).toLowerCase());

    const accessToken = await getAccessToken();
    const captureRes = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const order = captureRes.data;

    // Typical statuses: COMPLETED after successful capture
    const completed = order?.status === 'COMPLETED' ||
                      order?.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED';
    if (!completed) {
      // Often you'll see PAYER_ACTION_REQUIRED if not approved.
      return res.status(400).json({ error: 'Order not completed', paypal: order });
    }

    // Extract payer details to store
    const payer = order?.payer || {};
    const paypal_payer_id = payer?.payer_id || null;
    const paypal_email = (payer?.email_address || '').toLowerCase() || null;

    // Upsert payment method (provider='paypal') for this user
    await client.query('BEGIN');

    // Do we already have this payer_id for the user?
    const { rows: existing } = await client.query(
      `SELECT id FROM payment_methods
        WHERE user_id = $1 AND provider = 'paypal' AND paypal_payer_id = $2`,
      [userId, paypal_payer_id]
    );

    let pmId;
    if (existing[0]) {
      pmId = existing[0].id;
      await client.query(
        `UPDATE payment_methods
            SET paypal_email = $1, status = 'active', updated_at = NOW()
          WHERE id = $2`,
        [paypal_email, pmId]
      );
    } else {
      // optionally make default if user has no PMs yet
      let willBeDefault = makeDefault;
      if (!willBeDefault) {
        const { rows: countRows } = await client.query(
          `SELECT COUNT(*)::int AS n FROM payment_methods WHERE user_id = $1`,
          [userId]
        );
        willBeDefault = (countRows[0].n === 0);
      }

      if (willBeDefault) {
        await client.query(
          `UPDATE payment_methods SET is_default = FALSE, updated_at = NOW()
            WHERE user_id = $1`,
          [userId]
        );
      }

      const ins = await client.query(
        `INSERT INTO payment_methods
           (user_id, provider, paypal_payer_id, paypal_email, status, is_default)
         VALUES
           ($1, 'paypal', $2, $3, 'active', $4)
         RETURNING id`,
        [userId, paypal_payer_id, paypal_email, willBeDefault]
      );
      pmId = ins.rows[0].id;
    }

    await client.query('COMMIT');

    return res.json({
      status: 'COMPLETED',
      order_id: orderId,
      payment_method_id: pmId,
      provider: 'paypal',
      paypal_payer_id,
      paypal_email
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[PayPal captureOrder] Error:', err?.response?.data || err.message);
    const msg = err?.response?.data?.details?.[0]?.issue || 'Failed to capture PayPal order';
    return res.status(500).json({ error: msg });
  } finally {
    client.release();
  }
};

// OPTIONAL: Webhook to corroborate captures server-to-server (advanced)
// 1) Add the route in payments/paypal.js
// 2) Set webhook URL in the PayPal dashboard for the sandbox app
// 3) Verify signature headers and process events like PAYMENT.CAPTURE.COMPLETED
/*
exports.webhook = async (req, res) => {
  try {
    // You should verify the webhook signature here using PayPal's certificate/JWK.
    // If valid, inspect event type and update your DB accordingly.
    const event = JSON.parse(req.body.toString('utf8'));

    // Example:
    // if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') { ... }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[PayPal webhook] Error:', err.message);
    return res.status(400).send('Bad Request');
  }
};
*/
