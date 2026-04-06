# Virtual Hospital Platform — Back-End System

A full-featured virtual healthcare REST API built with **Node.js**, **Express**, and **PostgreSQL**. The platform serves three distinct user roles — **patients**, **doctors**, and **admins** — and covers the full clinical & administrative workflow of a digital hospital.

---

## Features

### Authentication & Authorization
- JWT-based authentication (Bearer token)
- OAuth2 Social Login via Google and Facebook (Passport.js)
- Role-based access control: `admin`, `doctor`, `patient`
- Plan-based feature gating for doctors (`checkPlanFeature` middleware)

### Patient
- Register, login, and manage profile
- Book, reschedule, and cancel appointments
- View medical records and prescriptions
- Upload and download clinical files (Multer)
- Answer health assessment questions (question bank)
- Submit and track pharmacy orders
- Submit insurance requests
- Manage billing and PayPal payments
- Open and track support tickets

### Doctor
- Manage profile and availability (time slots)
- View and respond to appointments
- Write prescriptions and add response notes
- Attach medical records to appointments
- Subscribe to doctor plans (feature-gated tiers)
- View patient health question responses

### Admin
- Full CRUD database board for all entities
- Manage doctor time slots and appointments
- Manage subscriptions and billing
- Manage doctor subscription plans
- Manage insurance requests
- Manage the health question bank
- View platform analytics: stats and charts
- Export data (CSV / PDF via `json2csv` and `pdfkit`)
- Manage health programs, services, and support tickets

### Platform-Wide
- Notification and messaging system
- Swagger / OpenAPI 3.0 documentation
- Rate limiting: login (5/min), OTP (3/10 min), general API (100/15 min)
- Helmet security headers + CSP in production
- HTTPS redirect behind reverse proxy in production
- Connection pooling with configurable pool size and timeouts

---

## Tech Stack

| Layer           | Technology                          |
|-----------------|-------------------------------------|
| Runtime         | Node.js                             |
| Framework       | Express 5                           |
| Database        | PostgreSQL (local or Neon cloud)    |
| Auth            | JWT, Passport.js (Google, Facebook) |
| Payments        | PayPal Checkout Server SDK          |
| File Uploads    | Multer                              |
| PDF Generation  | pdfkit                              |
| CSV Export      | json2csv                            |
| Security        | Helmet, express-rate-limit, bcrypt  |
| Validation      | express-validator                   |
| API Docs        | Swagger (swagger-jsdoc + swagger-ui-express) |
| Testing         | Jest, Supertest                     |

---

## Installation

```bash
git clone https://github.com/your-repo/virtual-hospital-platform.git
cd virtual-hospital-platform
npm install
cp env.example .env
```

Edit `.env` with your credentials (see Environment Variables below), then start the server:

```bash
node index.js
```

---

## Environment Variables

Copy `env.example` to `.env` and fill in the values. **Never commit `.env`.**

```env
# Server
PORT=5000

# Database — set DB_MODE to "neon" (cloud connection string) or "local" (discrete credentials)
DB_MODE=neon

# Neon / cloud mode: provide a full connection string
DB_URL=

# Local mode: provide individual credentials
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=virtual_hospital_platform
DB_PASSWORD=
DB_PORT=5432

# Connection pool tuning (optional)
DB_SSL=false
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONN_TIMEOUT_MS=10000

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=1d

# OAuth2 — Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth2 — Facebook
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_CURRENCY=USD

# CORS
FRONTEND_ORIGIN=http://localhost:3000

# Encryption (used for sensitive data at rest)
ENCRYPTION_KEY=
```

---

## Database Setup

Two SQL scripts are provided in `src/SQL Queries/`:

```bash
# Fresh production setup (schema + seed data)
psql -U your_user -d virtual_hospital_platform -f "src/SQL Queries/ProductionSetup.sql"

# Reset to demo data (useful for development/staging)
psql -U your_user -d virtual_hospital_platform -f "src/SQL Queries/resetDemoData.sql"
```

---

## Testing

Create a `.env.test` file in the project root. At minimum it needs `NODE_ENV=test` and a test database URL.

```bash
# Run all tests
npm test

# Watch mode
npm run watch

# Coverage report
npm run coverage
```

Coverage is collected from `src/{config,controllers,middleware,routes,utils,validators}`.

---

## API Documentation

Swagger UI is served at:

```
http://localhost:5000/api-docs
```

It is also accessible through the admin dashboard.

---

## API Route Map

| Prefix | Description |
|--------|-------------|
| `POST /api/auth` | Register, login, OAuth callbacks, password reset |
| `GET/PUT /api/profile` | Authenticated user profile |
| `GET /api/dashboard` | Role-aware dashboard data |
| `/api/admin/*` | Admin operations (appointments, billing, stats, charts, plans, insurance, time slots) |
| `/api/adminBoard/*` | Raw CRUD board for all database entities |
| `/api/doctor/*` | Doctor profile, appointments, time slots, subscriptions |
| `/api/patient/*` | Patient profile and appointments |
| `/api/medical-records` | Upload and retrieve medical records |
| `/api/prescriptions` | Create and view prescriptions |
| `/api/files` | File upload/download |
| `/api/pharmacy-orders` | Pharmacy order management |
| `/api/medications` | Medication catalogue |
| `/api/payments/*` | Billing, subscriptions, PayPal, webhooks |
| `/api/questions` | Patient health assessments and doctor responses |
| `/api/insurance-requests` | Insurance request lifecycle |
| `/api/support-tickets` | Patient support ticket management |

---

## Project Structure

```
virtual-hospital-platform/
├── public/                     # Static HTML pages served to the browser
│
├── src/
│   ├── app.js                  # Express app — middleware & route registration
│   ├── config/
│   │   ├── db.js               # PostgreSQL connection pool (Neon + local modes)
│   │   ├── swagger.js          # Swagger / OpenAPI spec config
│   │   └── jest.config.js      # Jest configuration
│   │
│   ├── controllers/
│   │   ├── admin/              # Admin-specific business logic
│   │   ├── authentication/     # Auth, JWT, OAuth strategies
│   │   ├── databaseAdminBoard/ # Raw CRUD controllers for the admin board
│   │   ├── doctor/             # Doctor workflows
│   │   ├── patient/            # Patient workflows
│   │   ├── payments/           # Billing, PayPal, subscriptions, webhooks
│   │   ├── Files/              # File upload/download
│   │   ├── insurance/          # Insurance requests
│   │   ├── medicalRecords/     # Medical record management
│   │   ├── medications/        # Medication catalogue
│   │   ├── PharmacyOrders/     # Pharmacy order processing
│   │   ├── prescriptions/      # Prescription management
│   │   ├── profile/            # User profile updates
│   │   ├── questions/          # Patient health question bank
│   │   └── supportTickets/     # Support ticket system
│   │
│   ├── middleware/
│   │   ├── verifyToken.js      # JWT verification
│   │   ├── requireRole.js      # Role-based access control
│   │   ├── checkPlanFeature.js # Doctor subscription plan feature gating
│   │   ├── rateLimit.js        # Rate limiters (login, OTP, general)
│   │   ├── uploadMiddleware.js # Multer configuration
│   │   └── fileValidator.js    # Uploaded file type/size validation
│   │
│   ├── routes/                 # Express routers (mirrors controllers structure)
│   │
│   ├── SQL Queries/
│   │   ├── ProductionSetup.sql # Full schema + seed for production
│   │   └── resetDemoData.sql   # Reset to demo data
│   │
│   ├── utils/
│   │   ├── encrypt.js          # Encryption helpers
│   │   ├── pagination.js       # Reusable pagination utility
│   │   └── paypalClient.js     # PayPal SDK client initialisation
│   │
│   └── validators/             # express-validator rule sets
│       ├── appointmentsValidation.js
│       ├── prescriptionsValidation.js
│       └── questionsValidation.js
│
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests (hits real DB)
│   └── __mocks__/              # Jest manual mocks
│
├── index.js                    # Server entry point
├── env.example                 # Environment variable template
└── package.json
```

---

## Security

- **JWT** — short-lived tokens verified on every protected route
- **Helmet** — sets secure HTTP headers in production with a strict CSP
- **HTTPS redirect** — enforced in production behind a proxy (Render, NGINX, etc.)
- **Rate limiting** — brute-force protection on login (5 req/min) and OTP (3 req/10 min) endpoints
- **bcrypt** — passwords hashed before storage
- **express-validator** — all user inputs validated at the boundary
- **Plan feature gating** — doctor features locked behind subscription tier checks
- **CORS** — restricted to configured origins only

---

## Default Admin Credentials

```
Email:    admin@virtualhospitalplatform.com
Password: admin123  (stored as bcrypt hash in the DB)
```

---

## License

Proprietary — licensed by the Virtual Hospital Platform team.
