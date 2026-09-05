const db = require('../../config/db');

exports.createBill = async (req, res) => {
  const { patient_id, amount, details } = req.body;

  if (!patient_id || isNaN(patient_id)) {
    return res.status(400).json({ error: 'Invalid or missing patient_id' });
  }
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid billing amount' });
  }

  try {
    const result = await db.query(
      'INSERT INTO bills (patient_id, amount, status, billing_date, details) VALUES ($1, $2, $3, NOW(), $4) RETURNING *',
      [patient_id, amount, 'pending', details]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// Update bill status
exports.updateBillStatus = async (req, res) => {
  const billId = req.params.id;
  const { status } = req.body;

  try {
    const result = await db.query(
      'UPDATE bills SET status = $1 WHERE id = $2 RETURNING *',
      [status, billId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// Delete a bill
exports.deleteBill = async (req, res) => {
  const billId = req.params.id;

  try {
    await db.query('DELETE FROM bills WHERE id = $1', [billId]);
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
