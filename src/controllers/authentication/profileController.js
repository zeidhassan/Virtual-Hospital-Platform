const pool = require('../../config/db');

exports.getUserProfile = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Get basic user info
    const userResult = await pool.query('SELECT id, full_name, email, role, phone, gender, date_of_birth, profile_picture_url FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userInfo = userResult.rows[0];

    if (userRole === 'doctor') {
      const doctorResult = await pool.query('SELECT id, specialization, qualifications, availability_status, bio FROM doctors WHERE user_id = $1', [userId]);
      const doc = doctorResult.rows[0] || {};
      return res.json({ ...userInfo, doctorId: doc.id, specialization: doc.specialization, qualifications: doc.qualifications, availability_status: doc.availability_status, bio: doc.bio });
    } else if (userRole === 'patient') {
      const patientResult = await pool.query('SELECT id, blood_group, address, allergies, chronic_conditions FROM patients WHERE user_id = $1', [userId]);
      const pat = patientResult.rows[0] || {};
      return res.json({ ...userInfo, patientId: pat.id, blood_group: pat.blood_group, address: pat.address, allergies: pat.allergies, chronic_conditions: pat.chronic_conditions });
    } else {
      return res.json(userInfo); // Admins only get user info
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
