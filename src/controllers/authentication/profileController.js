const pool = require('../../config/db');

exports.getUserProfile = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Get basic user info
    const userResult = await pool.query('SELECT id, full_name, email, role, phone, gender, date_of_birth FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userInfo = userResult.rows[0];

    if (userRole === 'doctor') {
      const doctorResult = await pool.query('SELECT specialization, qualifications, availability_status, bio FROM doctors WHERE id = $1', [userId]);
      return res.json({ ...userInfo, ...doctorResult.rows[0] });
    } else if (userRole === 'patient') {
      const patientResult = await pool.query('SELECT blood_group, address, allergies, chronic_conditions FROM patients WHERE id = $1', [userId]);
      return res.json({ ...userInfo, ...patientResult.rows[0] });
    } else {
      return res.json(userInfo); // Admins only get user info
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
