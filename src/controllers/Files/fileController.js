const path = require('path');
const fs = require('fs');

exports.getPrescriptionFile = (req, res) => {
  const filePath = path.join(__dirname, '../../../uploads/prescriptions', req.params.filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Restrict to authenticated users only
  res.sendFile(filePath);
};

exports.getMedicalRecordFile = (req, res) => {
  const filePath = path.join(__dirname, '../../../uploads/medical-records', req.params.filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Restrict to authenticated users only
  res.sendFile(filePath);
};
