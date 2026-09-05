const pool = require('../../config/db'); // PostgreSQL connection pool
const handleDbError = require('../../utils/handleDbError');
const paginate = require('../../utils/pagination'); // Pagination utility
const bcrypt = require('bcryptjs');

// Never return password_hash to the admin UI, even though nothing displays it.
const PUBLIC_COLUMNS = 'id, full_name, email, role, phone, gender, date_of_birth, profile_picture_url, login_attempts, locked_until, created_at, updated_at';

// GET all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

     // Extract all valid filters from query
    const validColumns = [
      "id",
      "full_name",
      "email",
      "password_hash",
      "role",
      "phone",
      "gender",
      "date_of_birth",
      "profile_picture_url",
      "login_attempts",
      "locked_until",
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
      table: 'users',
      page,
      limit,
      sort,
      filters,
      select: PUBLIC_COLUMNS
    });

    res.json(result); 
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

// GET user by ID (admin only)
exports.getUserById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admins only.' });
    }

    const result = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// CREATE a new user (admin only)
exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users.' });
    }

    const { full_name, email, password, role, phone, gender, date_of_birth, profile_picture_url } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields: full_name, email, password, role' });
    }

    // Hash the plain password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert into users table
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, gender, date_of_birth, profile_picture_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${PUBLIC_COLUMNS}`,
      [full_name, email, password_hash, role, phone, gender, date_of_birth, profile_picture_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE a user (admin only)
exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update users.' });
    }

    const { full_name, email, role, phone, gender, date_of_birth, password, profile_picture_url, login_attempts, locked_until } = req.body;

    let query = `
      UPDATE users
      SET full_name=$1, email=$2, role=$3, phone=$4, gender=$5, date_of_birth=$6,
          profile_picture_url=$7, login_attempts=$8, locked_until=$9, updated_at=NOW()`;
    const values = [full_name, email, role, phone, gender, date_of_birth, profile_picture_url, login_attempts, locked_until];

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      query += `, password_hash=$10 WHERE id=$11 RETURNING ${PUBLIC_COLUMNS}`;
      values.push(password_hash, req.params.id);
    } else {
      query += ` WHERE id=$10 RETURNING ${PUBLIC_COLUMNS}`;
      values.push(req.params.id);
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    return handleDbError(err, res);
  }
};

// DELETE a user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users.' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    return handleDbError(err, res);
  }
};

// UPDATE own user (all can access)
exports.updateOwnProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, phone, gender, date_of_birth } = req.body;

    const updates = [];
    const values = [];
    let i = 1;

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${i++}`);
      values.push(hashed);
    }

    if (phone) {
      updates.push(`phone = $${i++}`);
      values.push(phone);
    }

    if (gender) {
      updates.push(`gender = $${i++}`);
      values.push(gender);
    }

    if (date_of_birth) {
      updates.push(`date_of_birth = $${i++}`);
      values.push(date_of_birth);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No data to update.' });

    const query = `
      UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${i} RETURNING id, email, full_name, phone, gender, date_of_birth, role`;
    values.push(userId);

    const result = await pool.query(query, values);

    res.json({ message: 'Profile updated', user: result.rows[0] });

  } catch (err) {
    console.error('[ERROR] Update profile failed:', err.message);
    return handleDbError(err, res);
  }
};
