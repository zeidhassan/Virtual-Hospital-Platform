const pool = require('../../config/db'); // PostgreSQL connection pool
const paginate = require('../../utils/pagination'); // Pagination utility
const bcrypt = require('bcryptjs');

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
      filters
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

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE a new user (admin only)
exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users.' });
    }

    const { full_name, email, password, role, phone, gender, date_of_birth } = req.body;

    // Hash the plain password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert into users table
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, gender, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [full_name, email, password_hash, role, phone, gender, date_of_birth]
    );

    // Insert into user_passwords table
    await pool.query(
      `INSERT INTO user_passwords (email, password) VALUES ($1, $2)`,
      [email, password]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE a user (admin only)
exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update users.' });
    }

    const { full_name, email, role, phone, gender, date_of_birth, password } = req.body;

    let query = `
      UPDATE users
      SET full_name=$1, email=$2, role=$3, phone=$4, gender=$5, date_of_birth=$6, updated_at=NOW()`;
    const values = [full_name, email, role, phone, gender, date_of_birth];

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      query += `, password_hash=$7 WHERE id=$8 RETURNING *`;
      values.push(password_hash, req.params.id);
    } else {
      query += ` WHERE id=$7 RETURNING *`;
      values.push(req.params.id);
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If password was updated, update user_passwords table as well
    if (password) {
      await pool.query(
        `UPDATE user_passwords SET password = $1 WHERE email = $2`,
        [password, email]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

// UPDATE own user (all can access)
exports.updateOwnProfile = async (req, res) => {
  try {
    console.log('[DEBUG] Authenticated user ID:', req.user.id);
    console.log('[DEBUG] Request body:', req.body);

    const userId = req.user.id;
    const { password, phone, gender, date_of_birth } = req.body;

    const updates = [];
    const values = [];
    let i = 1;

    let plainPassword = null;

    if (password) {
      plainPassword = password;
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

    // Update plain password in user_passwords table too
    if (plainPassword) {
      const email = result.rows[0].email;
      await pool.query(
        `UPDATE user_passwords SET password = $1 WHERE email = $2`,
        [plainPassword, email]
      );
    }

    res.json({ message: 'Profile updated', user: result.rows[0] });

  } catch (err) {
    console.error('[ERROR] Update profile failed:', err.message);
    res.status(500).json({ error: err.message });
  }
};
