const multer = require('multer');
const path = require('path');

// Allowed MIME types
const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

// Shared file filter
const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
  }
};

// Reusable function to configure storage
const createStorage = (folderName) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, `../../uploads/${folderName}`));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  });
};

// Middleware for medical records
const uploadMedicalRecord = multer({
  storage: createStorage('medical-records'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware for prescriptions
const uploadPrescription = multer({
  storage: createStorage('prescriptions'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware for support tickets file uploads
const uploadSupportTicket = multer({
  storage: createStorage('support-tickets'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = {
  uploadMedicalRecord,
  uploadPrescription,
  uploadSupportTicket
};