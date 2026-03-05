const db = require('../../config/db');

// Utility: parse date filters
function buildDateFilter(start, end, columnName = 'created_at') {
  let filter = '1=1';
  const values = [];

  if (start) {
    values.push(start);
    filter += ` AND ${columnName} >= $${values.length}`;
  }
  if (end) {
    values.push(end);
    filter += ` AND ${columnName} <= $${values.length}`;
  }

  return { filter, values };
}

// Utility: get query options like top=5, sort=asc
function getQueryOptions(req) {
  const top = parseInt(req.query.top) || 5;
  const sort = req.query.sort === 'asc' ? 'ASC' : 'DESC';
  const from = req.query.from;
  const to = req.query.to;
  return { top, sort, from, to };
}

// 1. Top doctors by number of appointments
exports.getTopDoctorsByAppointments = async (req, res) => {
  try {
    const { top, sort, from, to } = getQueryOptions(req);
    const { filter, values } = buildDateFilter(from, to, 'appointment_date');

    const query = `
      SELECT u.full_name AS doctor_name, COUNT(a.id) AS count
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON u.id = d.user_id
      WHERE ${filter}
      GROUP BY u.full_name
      ORDER BY count ${sort}
      LIMIT ${top}
    `;

    const result = await db.query(query, values);
    res.json({
      labels: result.rows.map(r => r.doctor_name),
      values: result.rows.map(r => parseInt(r.count))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Most ordered medications from pharmacy orders
exports.getTopMedications = async (req, res) => {
  try {
    const { top, sort, from, to } = getQueryOptions(req);
    const { filter, values } = buildDateFilter(from, to, 'ordered_at');

    const query = `
      SELECT TRIM(med.name) AS name, COUNT(*) AS count
      FROM pharmacy_orders po,
           unnest(string_to_array(po.medications, ',')) AS med(name)
      WHERE ${filter}
      GROUP BY med.name
      ORDER BY count ${sort}
      LIMIT ${top}
    `;

    const result = await db.query(query, values);
    res.json({
      labels: result.rows.map(r => r.name),
      values: result.rows.map(r => parseInt(r.count))
    });
  } catch (err) {
    console.error('Top medications error:', err);
    res.status(500).json({ error: 'Failed to load top medications' });
  }
};

// 3. Subscription plan distribution (pie chart ready)
exports.getSubscriptionDistribution = async (req, res) => {
  try {
    const { from, to } = getQueryOptions(req);
    const { filter, values } = buildDateFilter(from, to, 'start_date');

    const query = `
      SELECT plan_name, COUNT(*) AS count
      FROM subscriptions
      WHERE ${filter}
      GROUP BY plan_name
    `;

    const result = await db.query(query, values);
    res.json({
      labels: result.rows.map(r => r.plan_name),
      values: result.rows.map(r => parseInt(r.count))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
