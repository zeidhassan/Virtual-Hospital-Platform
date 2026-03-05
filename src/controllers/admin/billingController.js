const db = require('../../config/db');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// GET /api/admin/billing?status=...&date=...
exports.getFilteredBills = async (req, res) => {
  const { status, date } = req.query;
  let query = 'SELECT * FROM bills WHERE 1=1';
  const values = [];

  if (status) {
    values.push(status);
    query += ` AND status = $${values.length}`;
  }

  if (date) {
    values.push(date);
    query += ` AND DATE(billing_date) = $${values.length}`;
  }

  query += ' ORDER BY billing_date DESC';

  try {
    const result = await db.query(query, values);
    res.json(result.rows);
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
