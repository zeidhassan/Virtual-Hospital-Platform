const db = require('../../config/db');

// 1. Count users by role
exports.getUsersByRole = async (req, res) => {
  try {
    const result = await db.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Appointments count by status and date range
exports.getAppointmentsStats = async (req, res) => {
  const { status, start, end } = req.query;
  let query = 'SELECT status, COUNT(*) AS count FROM appointments WHERE 1=1';
  const values = [];

  if (status) {
    values.push(status);
    query += ` AND status = $${values.length}`;
  }
  if (start) {
    values.push(start);
    query += ` AND appointment_date >= $${values.length}`;
  }
  if (end) {
    values.push(end);
    query += ` AND appointment_date <= $${values.length}`;
  }

  query += ' GROUP BY status';

  try {
    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Prescriptions count by doctor (linked by appointment)
exports.getPrescriptionsStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.full_name AS doctor_name, COUNT(p.id) AS count
      FROM prescriptions p
      JOIN appointments a ON a.id = p.appointment_id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON u.id = d.user_id
      GROUP BY u.full_name
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 4. Pharmacy orders by status
exports.getPharmacyOrdersStats = async (req, res) => {
  try {
    const result = await db.query('SELECT status, COUNT(*) AS count FROM pharmacy_orders GROUP BY status');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Revenue from paid bills (monthly and yearly)
exports.getRevenueStats = async (req, res) => {
  try {
    const monthly = await db.query(`
      SELECT DATE_TRUNC('month', billing_date) AS month, SUM(amount) AS total
      FROM bills
      WHERE status = 'paid'
      GROUP BY month
      ORDER BY month DESC
    `);

    const yearly = await db.query(`
      SELECT DATE_TRUNC('year', billing_date) AS year, SUM(amount) AS total
      FROM bills
      WHERE status = 'paid'
      GROUP BY year
      ORDER BY year DESC
    `);

    res.json({ monthly: monthly.rows, yearly: yearly.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Active subscriptions by plan
exports.getSubscriptionsStats = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT plan_name, COUNT(*) AS count
      FROM subscriptions
      WHERE NOW() BETWEEN start_date AND end_date
      GROUP BY plan_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
