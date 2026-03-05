const { client } = require('../../utils/paypalClient');
const paypal = require('@paypal/checkout-server-sdk');
const db = require('../../config/db');
const notificationsController = require('../databaseAdminBoard/notificationsController');

exports.createOrder = async (req, res) => {
  const {
    amount,
    bill_id,
    payment_method,
    insurance_company,
    insurance_id_number,
    start_date,
    end_date,
    doctor_id // ✅ doctor_id should come from frontend if insurance flow
  } = req.body;

  const userId = req.user.id;

  if (payment_method === 'use_insurance') {
    // ✅ 1) Create insurance request
    await db.query(`
      INSERT INTO insurance_requests 
        (patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    `, [userId, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date]);

    // ✅ 2) Mark bill as insurance_pending
    await db.query(`UPDATE bills SET status = 'insurance_pending' WHERE id = $1`, [bill_id]);

    // ✅ 3) Send request to doctor for approval
    await notificationsController.createNotification(
      doctor_id,
      'Insurance Approval Needed',
      `A patient submitted insurance info for Bill #${bill_id}. Please review and approve or reject.`
    );

    // ✅ 4) Notify patient
    await notificationsController.createNotification(
      userId,
      'Insurance Request Submitted',
      `Your insurance request for Bill #${bill_id} has been submitted and is awaiting doctor approval.`
    );

    return res.status(200).json({
      message: 'Insurance request submitted, doctor notified, and patient notified. Waiting for approval.'
    });
  }

  // ELSE: Normal PayPal Order flow (unchanged)
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'SAR', value: amount }
    }]
  });

  const order = await client().execute(request);

  res.status(200).json({
    message: 'PayPal order created.',
    order_id: order.result.id,
    links: order.result.links
  });
};


exports.captureOrder = async (req, res) => {
  const orderId = req.body.orderID;
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const response = await client().execute(request);
    res.json({ status: response.result.status, details: response.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
