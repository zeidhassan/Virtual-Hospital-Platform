const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist at startup
['medical-records', 'prescriptions', 'support-tickets', 'profile-pictures', 'messages'].forEach((dir) => {
  fs.mkdirSync(path.join(__dirname, `../../uploads/${dir}`), { recursive: true });
});

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

// Profile pictures: images only, no PDFs
const imageOnlyTypes = ['image/jpeg', 'image/png', 'image/webp'];
const imageOnlyFilter = (req, file, cb) => {
  if (imageOnlyTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WEBP images are allowed.'));
  }
};

// Prescription uploads also accept plain text files (a scanned Rx note, typed instructions, etc.)
const prescriptionAllowedTypes = [...allowedTypes, 'text/plain'];
const prescriptionFileFilter = (req, file, cb) => {
  if (prescriptionAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and TXT are allowed.'));
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
  fileFilter: prescriptionFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware for support tickets file uploads
const uploadSupportTicket = multer({
  storage: createStorage('support-tickets'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware for profile pictures
const uploadProfilePicture = multer({
  storage: createStorage('profile-pictures'),
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
});

// Middleware for chat message attachments
const uploadAttachment = multer({
  storage: createStorage('messages'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Wraps a multer instance so filter/limit errors return JSON 400 instead of HTML
const wrapUpload = (multerInstance, fieldName) => (req, res, next) => {
  multerInstance.single(fieldName)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

module.exports = {
  uploadMedicalRecord,
  uploadPrescription,
  uploadSupportTicket,
  uploadProfilePicture,
  uploadAttachment,
  wrapUpload
};