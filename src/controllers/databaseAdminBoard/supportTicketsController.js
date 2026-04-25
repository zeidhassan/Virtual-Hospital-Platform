const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility

// GET all support tickets (admin only)
exports.getAllSupportTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "user_id",
      "subject",
      "description",
      "status",
      "doctor_assigned",
      "patient_assigned",
      "created_at",
      "updated_at"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'support_tickets',
      page,
      limit,
      sort,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

// GET a support ticket by ID (admin only)
exports.getSupportTicketById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a support ticket (admin only)
exports.createSupportTicket = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create support tickets.' });
  }

  const { user_id, subject, description, status, file_url, doctor_assigned, patient_assigned } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, subject, description, status, file_url, doctor_assigned, patient_assigned)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, subject, description, status, file_url, doctor_assigned, patient_assigned]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE a support ticket (admin only)
exports.updateSupportTicket = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update support tickets.' });
  }

  const { subject, description, status, file_url, doctor_assigned, patient_assigned } = req.body;

  try {
    const result = await pool.query(
      `UPDATE support_tickets 
       SET subject = $1, description = $2, status = $3, file_url = $4, doctor_assigned = $5, patient_assigned = $6
       WHERE id = $7 RETURNING *`,
      [subject, description, status, file_url, doctor_assigned, patient_assigned, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE a support ticket (admin only)
exports.deleteSupportTicket = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete support tickets.' });
  }

  try {
    const result = await pool.query('DELETE FROM support_tickets WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Support ticket deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};
