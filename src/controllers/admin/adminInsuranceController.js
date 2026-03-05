// src/controllers/admin/adminInsuranceController.js

const db = require('../../config/db');
const { Parser } = require('json2csv');

// 1) Stats: insurance accepted vs rejected
exports.getInsuranceUsageStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT status, COUNT(*) AS count
      FROM insurance_requests
      GROUP BY status
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching insurance stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2) Filter bills by payment type: direct vs insurance
exports.getBillsByPaymentType = async (req, res) => {
  const { payment_type } = req.query;

  try {
    let result;

    if (payment_type === 'insurance') {
      // Bills that appear in insurance_requests
      result = await db.query(`
        SELECT b.*, u.full_name AS patient_name
        FROM bills b
        JOIN insurance_requests ir ON b.id = ir.bill_id
        JOIN patients p ON b.patient_id = p.id
        JOIN users u ON p.user_id = u.id
        GROUP BY b.id, u.full_name
      `);
    } else if (payment_type === 'direct') {
      // Bills NOT in insurance_requests
      result = await db.query(`
        SELECT b.*, u.full_name AS patient_name
        FROM bills b
        LEFT JOIN insurance_requests ir ON b.id = ir.bill_id
        JOIN patients p ON b.patient_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE ir.id IS NULL
        GROUP BY b.id, u.full_name
      `);
    } else {
      return res.status(400).json({ error: 'Invalid payment_type. Use insurance or direct.' });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error filtering bills:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3) Export insurance transactions
exports.exportInsuranceTransactions = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        b.id,
        u.full_name AS patient_name,
        b.amount,
        b.details AS description,
        ir.insurance_company,
        ir.status AS insurance_status
      FROM bills b
      JOIN insurance_requests ir ON b.id = ir.bill_id
      JOIN patients p ON b.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      ORDER BY b.id
    `);

    const fields = ['id', 'patient_name', 'amount', 'description', 'insurance_company', 'insurance_status'];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('insurance_transactions.csv');
    return res.send(csv);
  } catch (err) {
    console.error('Error exporting insurance transactions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
