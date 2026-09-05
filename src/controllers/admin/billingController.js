const db = require('../../config/db');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// GET /api/admin/billing?status=...&date=...&page=...&limit=...
// Not routed through the shared paginate() utility because the date filter
// matches on DATE(b.billing_date), a function-wrapped expression paginate()'s
// generic column-filter validation doesn't support.
exports.getFilteredBills = async (req, res) => {
  const { status, date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`b.status = $${values.length}`);
  }

  if (date) {
    values.push(date);
    conditions.push(`DATE(b.billing_date) = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const dataQuery = `
      SELECT b.*, u.full_name AS patient_name
      FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      ${where}
      ORDER BY b.billing_date DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const countQuery = `
      SELECT COUNT(*) FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      ${where}
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [...values, limit, offset]),
      db.query(countQuery, values),
    ]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      totalItems: total,
      data: dataResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bills' });
  }
};

// CSV export
exports.exportBillsCSV = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM bills ORDER BY billing_date DESC');
    const parser = new Parser();
    const csv = parser.parse(result.rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('bills.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'CSV export failed' });
  }
};

// PDF export
exports.exportBillsPDF = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM bills ORDER BY billing_date DESC');
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bills.pdf"');

    doc.pipe(res); // stream directly to the response
    doc.fontSize(16).text('Billing Report', { align: 'center' }).moveDown();

    result.rows.forEach((bill, idx) => {
      doc.fontSize(10).text(
        `${idx + 1}. Patient ID: ${bill.patient_id}, Amount: ${bill.amount}, Date: ${bill.billing_date}, Status: ${bill.status}, Details: ${bill.details}`
      );
    });

    doc.end(); // signal PDF generation is complete
  } catch (err) {
    res.status(500).json({ error: 'PDF export failed' });
  }
};
