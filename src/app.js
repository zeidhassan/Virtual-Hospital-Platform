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

// Behind a reverse proxy (Render/NGINX/etc.), req.ip is otherwise the proxy's
// address for every request — which would make the rate limiters below key
// on one IP for all traffic. '1' trusts exactly one hop in front of us.
app.set('trust proxy', 1);

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
  process.env.FRONTEND_ORIGIN || 'https://helixacare.vercel.app'
]));

// ngrok free-tier URLs rotate every session, so they can't be listed by exact
// value — match any subdomain of the tunnel domains instead.
const ngrokOriginPattern = /^https:\/\/[a-z0-9-]+\.(ngrok-free\.app|ngrok\.io|ngrok\.app)$/;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || ngrokOriginPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // allowed HTTP methods
  credentials: true // allow cookies or credentials if needed
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

app.use(passport.initialize());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger
const swaggerSpec = require('./config/swagger');  // make sure path is correct

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// General traffic ceiling across the whole API — the stricter per-route
// limiters (login, register, triage) still apply on top of this.
const { generalApiLimiter } = require('./middleware/rateLimit');
app.use('/api', generalApiLimiter);

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
app.use('/api/adminBoard/patient-health-programs', require('./routes/databaseAdminBoard/patientHealthPrograms'));
app.use('/api/adminBoard/health-logs', require('./routes/databaseAdminBoard/healthLogs'));
app.use('/api/adminBoard/patient-insurance', require('./routes/databaseAdminBoard/patientInsurance'));
app.use('/api/adminBoard/payment-methods', require('./routes/databaseAdminBoard/paymentMethods'));
app.use('/api/adminBoard/payment-transactions', require('./routes/databaseAdminBoard/paymentTransactions'));
app.use('/api/adminBoard/billing-addresses', require('./routes/databaseAdminBoard/billingAddresses'));
app.use('/api/adminBoard/conversations', require('./routes/databaseAdminBoard/conversations'));
app.use('/api/adminBoard/conversation-participants', require('./routes/databaseAdminBoard/conversationParticipants'));
app.use('/api/adminBoard/question-assignments', require('./routes/databaseAdminBoard/questionAssignments'));
app.use('/api/adminBoard/triage-sessions', require('./routes/databaseAdminBoard/triageSessions'));
app.use('/api/adminBoard/triage-symptom-rules', require('./routes/databaseAdminBoard/triageSymptomRules'));

app.use('/api/auth', require('./routes/authentication/auth'));
app.use('/api/auth/profile', require('./routes/authentication/profile'));
app.use('/api/dashboard', require('./routes/dashboard/dashboard'));

app.use('/api/profile', require('./routes/profile/profile'));  // NEW

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

// Profile pictures are the one upload type that's genuinely public — shown
// across roles (a patient sees their doctor's avatar, etc.) so they stay on
// a narrow static mount. Every other upload type (medical records,
// prescriptions, support-ticket attachments) is served only through the
// authenticated, ownership-checked routes in /api/files.
app.use('/uploads/profile-pictures', express.static(path.join(__dirname, '../uploads/profile-pictures')));

// Medical record uploads/listing live under /api/doctor and /api/patient —
// this module only keeps the record-delete endpoint (see the route file).
app.use('/api/medical-records', require('./routes/medicalRecords/medicalRecords'));
app.use('/api/files', require('./routes/files/files'));

app.use('/api/pharmacy-orders', require('./routes/PharmacyOrders/pharmacyOrders'));
app.use('/api/medications', require('./routes/medications/medications'));

app.use('/api/payments', require('./routes/payments/payments'));
app.use('/api/payments/bills', require('./routes/payments/bills'));

app.use('/api/questions', require('./routes/questions/questions'));
app.use('/api/question-assignments', require('./routes/questions/questionAssignments'));
app.use('/api/admin/questions', require('./routes/admin/questionsAdmin'));

app.use('/api/insurance-requests', require('./routes/insurance/insuranceRequests'))

app.use('/api/support-tickets', require('./routes/supportTickets/supportTickets'));

app.use('/api/triage', require('./routes/triage/triage'));

app.use('/api/follow-ups', require('./routes/followUp/followUps'));
app.use('/api/health-programs', require('./routes/healthPrograms/healthPrograms'));
app.use('/api/health-logs', require('./routes/healthLogs/healthLogs'));
app.use('/api/consultation-history', require('./routes/consultationHistory/consultationHistory'));

app.use('/api/messages', require('./routes/messages/messages'));
app.use('/api/notifications', require('./routes/notifications/notifications'));

// 404 for anything that didn't match a route above.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Final error handler — must be registered after every route so Express
// actually reaches it. Logs the real error server-side but never sends
// err.message to the client, since PG/validation errors can leak column
// names, query fragments, or other internals.
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
