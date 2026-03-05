const db = require('../../config/db');

// Helper function to check admin or doctor
function isPrivileged(role) {
  return role === 'admin' || role === 'doctor';
}

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
    res.status(500).json({ error: err.message });
  }
};

// Get bills by patient (patient can only view their own)
exports.getBillsByPatient = async (req, res) => {
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];
  const patientId = req.params.id;

  if (userRole === 'patient' && parseInt(patientId) !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM bills WHERE patient_id = $1 ORDER BY billing_date DESC',
      [patientId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

// Delete a bill
exports.deleteBill = async (req, res) => {
  const billId = req.params.id;

  try {
    await db.query('DELETE FROM bills WHERE id = $1', [billId]);
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
