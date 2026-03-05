// app.js
const express = require('express');
const path = require('path');
const passport = require('passport');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
require('dotenv').config();

// Strategies
require('./controllers/authentication/googleStrategy');
require('./controllers/authentication/facebookStrategy');

const app = express();

// Security Middleware
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());

  // ⚠️ Permissive CSP to allow inline <script> and onclick="...":
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],

        // Allow same-origin scripts, your CDN, and ALL inline scripts
        // Replace the CDN below with your real one(s)
        scriptSrc: ["'self'", "https://trusted.cdn.com", "'unsafe-inline'"],
        // Allow inline event handlers like onclick="", onsubmit="", etc.
        scriptSrcAttr: ["'unsafe-inline'"],

        // You already allow inline styles
        styleSrc: ["'self'", "'unsafe-inline'"],

        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        // Keep this if you want automatic http->https upgrades by browsers
        upgradeInsecureRequests: [],
        // (Optional hardening you can keep)
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    })
  );

  // Force HTTPS behind a proxy (e.g., Render/NGINX)
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
} else {
  // Dev: remove CSP & disable caching for easier debugging
  app.use((req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
}

// CORS Middleware
// Define CORS options
const allowedOrigins = Array.from(new Set([
  'http://localhost:3000',
  process.env.FRONTEND_ORIGIN || 'https://virtual-hospital-platform.vercel.app/'
]));

const corsOptions = {
  origin: allowedOrigins, // allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // allowed HTTP methods
  credentials: true // allow cookies or credentials if needed
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Debugging
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ message: 'Unexpected error', error: err.message });
});

app.use(passport.initialize());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));

// Swagger
const swaggerSpec = require('./config/swagger');  // make sure path is correct

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/adminBoard/users', require('./routes/databaseAdminBoard/users'));
app.use('/api/adminBoard/doctors', require('./routes/databaseAdminBoard/doctors'));
app.use('/api/adminBoard/patients', require('./routes/databaseAdminBoard/patients'));
app.use('/api/adminBoard/appointments', require('./routes/databaseAdminBoard/appointments'));
app.use('/api/adminBoard/doctor-time-slots', require('./routes/databaseAdminBoard/doctorTimeSlots'));
app.use('/api/adminBoard/appointment-status-logs', require('./routes/databaseAdminBoard/appointmentStatusLogs'));
app.use('/api/adminBoard/prescriptions', require('./routes/databaseAdminBoard/prescriptions'));
app.use('/api/adminBoard/medical-records', require('./routes/databaseAdminBoard/medicalRecords'));
app.use('/api/adminBoard/bills', require('./routes/databaseAdminBoard/bills'));
app.use('/api/adminBoard/plans', require('./routes/databaseAdminBoard/plans')); // NEW
app.use('/api/adminBoard/subscriptions', require('./routes/databaseAdminBoard/subscriptions'));
app.use('/api/adminBoard/messages', require('./routes/databaseAdminBoard/messages'));
app.use('/api/adminBoard/notifications', require('./routes/databaseAdminBoard/notifications'));
app.use('/api/adminBoard/medications', require('./routes/databaseAdminBoard/medications')); // NEW
app.use('/api/adminBoard/pharmacy-orders', require('./routes/databaseAdminBoard/pharmacyOrders'));
app.use('/api/adminBoard/question-bank', require('./routes/databaseAdminBoard/questionBank')); // NEW
app.use('/api/adminBoard/patient-question-responses', require('./routes/databaseAdminBoard/patientQuestionResponses')); // NEW
app.use('/api/adminBoard/doctor-response-notes', require('./routes/databaseAdminBoard/doctorResponseNotes')); // NEW
app.use('/api/adminBoard/doctor-plans', require('./routes/databaseAdminBoard/doctorPlans.js')); // NEW
app.use('/api/adminBoard/doctor-subscriptions', require('./routes/databaseAdminBoard/doctorSubscriptions')); // NEW
app.use('/api/adminBoard/insurance-requests', require('./routes/databaseAdminBoard/insuranceRequests')); // NEW
app.use('/api/adminBoard/support-tickets', require('./routes/databaseAdminBoard/supportTickets'));
app.use('/api/adminBoard/support-ticket-replies', require('./routes/databaseAdminBoard/supportTicketReplies')); // NEW 
app.use('/api/adminBoard/services', require('./routes/databaseAdminBoard/services'));
app.use('/api/adminBoard/health-programs', require('./routes/databaseAdminBoard/healthPrograms.js')); // MODIFIED API NAME (programs -> health-programs)

app.use('/api/payments/paypal', require('./routes/payments/paypal'));


app.use('/api/auth', require('./routes/authentication/auth'));
app.use('/api/auth/profile', require('./routes/authentication/profile'));
app.use('/api/dashboard', require('./routes/dashboard/dashboard'));

app.use('/api/profile', require('./routes/profile/profile'));  // NEW

app.use('/api/admin', require('./routes/admin/admin'));
app.use('/api/admin/appointments', require('./routes/admin/adminAppointments'));
app.use('/api/admin/billing', require('./routes/admin/billing'));
app.use('/api/admin/subscriptions', require('./routes/admin/subscriptions'));
app.use('/api/admin/stats', require('./routes/admin/stats'));
app.use('/api/admin/charts', require('./routes/admin/charts'));
app.use('/api/admin/doctor-plans', require('./routes/admin/adminDoctorPlans'))
app.use('/api/admin/insurance', require('./routes/admin/adminInsurance'))
app.use('/api/admin/doctor-time-slots', require('./routes/admin/doctorTimeSlots'));

app.use('/api/doctor', require('./routes/doctor/doctor'));
app.use('/api/doctor/appointments', require('./routes/doctor/doctorAppointments'));
app.use('/api/doctor/subscriptions', require('./routes/doctor/doctorSubscriptions'))
app.use('/api/doctor/time-slots', require('./routes/doctor/doctorTimeSlots'));

app.use('/api/patient', require('./routes/patient/patient'));
app.use('/api/patient/appointments', require('./routes/patient/patientAppointments'));

// File Uploads? 
app.use('/uploads', express.static('uploads'));

app.use('/api/medical-records', require('./routes/medicalRecords/medicalRecords'));
app.use('/api/prescriptions', require('./routes/prescriptions/prescriptions'));
app.use('/api/files', require('./routes/files/files'));

app.use('/api/pharmacy-orders', require('./routes/PharmacyOrders/pharmacyOrders'));
app.use('/api/medications', require('./routes/medications/medications'));

app.use('/api/payments', require('./routes/payments/payments'));
app.use('/api/payments/bills', require('./routes/payments/bills'));
app.use('/api/payments/webhook', require('./routes/payments/webhook'));
app.use('/api/payments/subscriptions', require('./routes/payments/subscriptions'));

app.use('/api/questions', require('./routes/questions/questions'));
app.use('/api/admin/questions', require('./routes/admin/questionsAdmin'));
app.use('/api/patients', require('./routes/patient/patient'));

app.use('/api/insurance-requests', require('./routes/insurance/insuranceRequests'))

app.use('/api/support-tickets', require('./routes/supportTickets/supportTickets'));

// Frontend entry
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, ".." ,'public', 'register.html'));
});

module.exports = app;
