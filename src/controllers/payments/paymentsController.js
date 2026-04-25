const pool = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const notificationsController = require('../databaseAdminBoard/notificationsController');

const FPX_BANKS = {
  maybank:           'Maybank2u',
  cimb:              'CIMB Clicks',
  public_bank:       'Public Bank PBe',
  rhb:               'RHB Now',
  hong_leong:        'Hong Leong Connect',
  ambank:            'AmOnline',
  bank_islam:        'Bank Islam',
  bank_rakyat:       'Bank Rakyat',
  bank_muamalat:     'Bank Muamalat',
  affin_bank:        'Affin Bank',
  alliance_bank:     'Alliance Bank',
  ocbc:              'OCBC',
  standard_chartered:'Standard Chartered',
};

const mockTxRef = () => `HXC-${uuidv4().split('-')[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

// GET /api/payments/fpx-banks
exports.getFpxBanks = (req, res) => {
  res.json({ banks: Object.entries(FPX_BANKS).map(([id, name]) => ({ id, name })) });
};

// GET /api/payments/bills/my
exports.getMyBills = async (req, res) => {
  try {
    const patRes = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patRes.rows.length === 0) return res.status(403).json({ error: 'Patient record not found' });
    const patientId = patRes.rows[0].id;

    const result = await pool.query(
      `SELECT b.*,
        (SELECT row_to_json(t) FROM (
          SELECT transaction_ref, method_type, fpx_bank, created_at
          FROM payment_transactions WHERE bill_id = b.id ORDER BY created_at DESC LIMIT 1
        ) t) AS last_transaction
       FROM bills b WHERE b.patient_id = $1 ORDER BY b.billing_date DESC`,
      [patientId]
    );
    res.json({ data: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments/pay
exports.payBill = async (req, res) => {
  try {
    const {
      bill_id, method_type, fpx_bank,
      payment_method_id, save_card,
      card_number, cardholder_name, brand, exp_month, exp_year,
    } = req.body;
    const userId = req.user.id;

    if (!bill_id || isNaN(bill_id)) return res.status(400).json({ error: 'Invalid bill_id' });
    if (!['card', 'fpx'].includes(method_type)) return res.status(400).json({ error: 'method_type must be card or fpx' });
    if (method_type === 'fpx' && !FPX_BANKS[fpx_bank]) return res.status(400).json({ error: 'Invalid fpx_bank' });

    const patRes = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    if (patRes.rows.length === 0) return res.status(403).json({ error: 'Patient record not found' });
    const patientId = patRes.rows[0].id;

    const billRes = await pool.query('SELECT * FROM bills WHERE id = $1', [bill_id]);
    if (billRes.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    const bill = billRes.rows[0];
    if (bill.patient_id !== patientId) return res.status(403).json({ error: 'Access denied' });
    if (bill.status === 'paid') return res.status(400).json({ error: 'Bill already paid' });

    let pmId = payment_method_id ? Number(payment_method_id) : null;
    if (method_type === 'card' && save_card && card_number) {
      const saved = await pool.query(
        `INSERT INTO payment_methods (user_id, provider, cardholder_name, brand, last4, exp_month, exp_year, is_default)
         VALUES ($1, 'card', $2, $3, $4, $5, $6, false) RETURNING id`,
        [userId, cardholder_name || '', brand || 'unknown', String(card_number).replace(/\s/g, '').slice(-4), exp_month, exp_year]
      );
      pmId = saved.rows[0].id;
    }

    const txRef = mockTxRef();

    await pool.query(
      `INSERT INTO payment_transactions (user_id, bill_id, amount, method_type, fpx_bank, payment_method_id, transaction_ref, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'success')`,
      [userId, bill_id, bill.amount, method_type, fpx_bank || null, pmId, txRef]
    );

    await pool.query("UPDATE bills SET status = 'paid' WHERE id = $1", [bill_id]);

    await notificationsController.createNotification(
      userId,
      'Payment Successful',
      `Payment of MYR ${bill.amount} for Bill #${bill_id} processed. Ref: ${txRef}`
    );

    res.json({ success: true, transaction_ref: txRef, message: 'Payment successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/payments/transactions
exports.getMyTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pt.id, pt.amount, pt.method_type, pt.fpx_bank, pt.transaction_ref, pt.status, pt.created_at,
              b.details AS bill_details, b.id AS bill_id
       FROM payment_transactions pt
       LEFT JOIN bills b ON b.id = pt.bill_id
       WHERE pt.user_id = $1 ORDER BY pt.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
