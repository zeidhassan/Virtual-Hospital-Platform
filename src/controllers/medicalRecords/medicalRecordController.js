const pool = require('../../config/db');
const fs = require('fs');
const path = require('path');

// DELETE /medical-records/:id — admins can delete any record; doctors can
// only delete records they personally created (doctor_id must match their
// own). Patients are blocked at the route level (requireRole above).
exports.deleteRecord = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  try {
    const recordRes = await pool.query('SELECT file_url, doctor_id FROM medical_records WHERE id = $1', [id]);
    if (recordRes.rowCount === 0) return res.status(404).json({ message: 'Record not found' });
    const record = recordRes.rows[0];

    if (role === 'doctor') {
      const doctorRes = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
      const doctorId = doctorRes.rows[0]?.id;
      if (!doctorId || record.doctor_id !== doctorId) {
        return res.status(403).json({ error: 'You can only delete records you created.' });
      }
    }

    await pool.query('DELETE FROM medical_records WHERE id = $1', [id]);

    if (record.file_url) {
      const filePath = path.join(__dirname, '../../../', record.file_url);
      fs.unlink(filePath, (err) => {
        if (err) console.warn('File may not exist:', err.message);
      });
    }

    res.status(200).json({ message: 'Medical record deleted' });
  } catch (err) {
    console.error('Error deleting medical record:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
