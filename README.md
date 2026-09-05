# HelixaCare — Virtual Hospital Platform

A full-stack virtual hospital platform providing AI-assisted triage, teleconsultation, remote patient monitoring, and integrated digital health records — built as a **React (Vite)** frontend on top of a **Node.js / Express** REST API and a **36-table PostgreSQL** database. The system serves three roles — **Patient**, **Doctor**, and **Admin** — each with a dedicated dashboard and role-scoped access to the platform's features.

Validated by **297 automated tests across 31 Jest/Supertest suites**.

---

## Screenshots

### Patient

| Dashboard | AVA Triage | Book Appointment |
|---|---|---|
| ![Patient Dashboard](Screenshots/01_patient_dashboard.png) | ![AVA Triage](Screenshots/02_ava_triage.png) | ![Book Appointment](Screenshots/03_book_appointment.png) |

| Pharmacy — Place Order | Medical Records | Billing & Payments |
|---|---|---|
| ![Place Order](Screenshots/04_pharmacy_place_order.png) | ![Medical Records](Screenshots/05_patient_medical_records.png) | ![Billing & Payments](Screenshots/06_patient_billing_payments.png) |

### Doctor

| Dashboard | Escalated Triage | Patient Timeline |
|---|---|---|
| ![Doctor Dashboard](Screenshots/07_doctor_dashboard.png) | ![Escalated Triage](Screenshots/08_escalated_triage.png) | ![Patient Timeline](Screenshots/09_doctor_patient_timeline.png) |

| Medical Records | Pharmacy Orders | Time Slots |
|---|---|---|
| ![Doctor Medical Records](Screenshots/10_doctor_medical_records.png) | ![Doctor Pharmacy Orders](Screenshots/11_doctor_pharmacy_orders.png) | ![Time Slots](Screenshots/12_doctor_time_slots.png) |

### Admin

| Stats & Charts | Database Admin Board | Doctor Subscriptions |
|---|---|---|
| ![Admin Stats](Screenshots/13_admin_stats_charts.png) | ![Database Admin Board](Screenshots/14_admin_database_board.png) | ![Doctor Subscriptions](Screenshots/15_admin_doctor_subscriptions.png) |

| Insurance Requests | Billing | Support Tickets |
|---|---|---|
| ![Insurance Requests](Screenshots/16_admin_insurance_requests.png) | ![Admin Billing](Screenshots/17_admin_billing.png) | ![Support Tickets](Screenshots/18_admin_support_tickets.png) |

---

## Features

### AVA — AI-Assisted Triage
- Rule-based symptom classification (routine / urgent / emergency) against an admin-editable keyword table — transparent and traceable by design, not a black-box model
- Urgent/emergency cases automatically escalate into the doctor's Escalated Triage queue
- Full triage history per patient

### Patient
- Register/login (local + Google/Facebook OAuth), profile management
- AVA symptom triage, triage history
- Book, view, and manage appointments (database-level exclusion constraint prevents any double-booking)
- Medical records and prescriptions (encrypted at rest), prescription refill requests
- Pharmacy ordering, order history
- Billing & payments — mock FPX bank transfer or card, saved payment methods, insurance policy display
- Insurance claim submission and tracking
- Chronic-condition health logs and consultation history timeline
- Doctor-assigned health questionnaires
- Messaging, notifications, support tickets

### Doctor
- Dashboard with today's schedule, escalated triage alerts, and quick actions
- Patient list and full per-patient care timeline
- Appointment and weekly time-slot management
- Write/manage prescriptions, add and edit medical records
- Review and fulfil pharmacy orders for their own patients
- Accept/reject patient insurance claims
- Question bank contributions and patient questionnaire review
- Subscription plan management (Basic / Plus / Premium tiers)

### Admin
- Platform-wide analytics dashboard (revenue, appointments, users by role, top doctors/medications) via Recharts
- Generic Database Admin Board — CRUD access across every core entity, for operational data correction
- Appointment, billing, and pharmacy order oversight platform-wide
- Doctor subscription approval workflow, doctor plan management
- Insurance claim administration
- AVA triage rule configuration and triage session auditing
- Support ticket resolution, shared question bank moderation

### Platform-Wide
- JWT authentication with a revocation blacklist (logout actually invalidates the token)
- Role-based access control enforced at the middleware layer
- AES-256-GCM field-level encryption for sensitive record content
- Threaded messaging and a shared notification system
- Swagger / OpenAPI documentation
- Rate limiting (login, general API) and Helmet security headers
- Parameterised queries throughout — no raw string-built SQL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Recharts |
| Backend | Node.js, Express, raw `pg` driver (no ORM) |
| Database | PostgreSQL (local or Neon cloud), 36 relational tables |
| Auth | JWT, Passport.js (Google & Facebook OAuth) |
| Payments | Mock FPX / card flow (no live payment gateway) |
| Encryption | AES-256-GCM for sensitive field content |
| File Uploads | Multer |
| PDF / CSV Export | pdfkit, json2csv |
| Security | Helmet, express-rate-limit, bcrypt, express-validator |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Testing | Jest, Supertest (297 tests / 31 suites) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (local instance, or a [Neon](https://neon.tech) connection string)

### 1. Clone and install

```bash
git clone https://github.com/zeidhassan/virtual-hospital-platform.git
cd virtual-hospital-platform
npm install
npm install --prefix frontend
```

### 2. Configure environment variables

```bash
cp env.example .env
cp frontend/.env.example frontend/.env
```

Fill in `.env` (see [Environment Variables](#environment-variables) below). The frontend `.env` can usually be left as-is — it defaults to routing API calls through the Vite dev proxy.

### 3. Set up the database

```bash
# Fresh schema + seed data
psql -U your_user -d your_database -f "src/SQL Queries/ProductionSetup.sql"

# Or reset an existing database to clean demo data (safe to re-run)
psql -U your_user -d your_database -f "src/SQL Queries/resetDemoData.sql"
```

### 4. Run it

```bash
# From the project root — starts both the backend (port 5000) and the
# frontend dev server (port 3000) together
npm run dev
```

Or run them separately:

```bash
npm start                        # backend only, http://localhost:5000
npm run dev --prefix frontend    # frontend only, http://localhost:3000
```

### Demo credentials

After running `resetDemoData.sql`, every seeded account logs in with the password **`admin123`**:

| Role | Email |
|---|---|
| Admin | `admin@helixacare.com` |
| Doctor | `strange@helixacare.com` (also `palmer@helixacare.com`, `banner@helixacare.com`) |
| Patient | `jane@helixacare.com` (also `john@helixacare.com`, `sarah@helixacare.com`, `peter@helixacare.com`) |

---

## Environment Variables

```env
# Server
PORT=5000

# DB_MODE: "neon" (cloud connection string) or "local" (discrete credentials)
DB_MODE=local

# Neon / cloud mode
DB_URL=

# Local mode
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=helixacare_db
DB_PASSWORD=
DB_PORT=5432

# Connection pool tuning (optional)
DB_SSL=false
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONN_TIMEOUT_MS=10000

# JWT — required, no fallback (the app will refuse to start without it)
JWT_SECRET=

# Field-level encryption for sensitive record content — required, 64 hex
# characters (32 bytes)
ENCRYPTION_KEY=

# OAuth2 (optional — omit to disable social login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# CORS — the frontend origin allowed to call the API
FRONTEND_ORIGIN=http://localhost:3000
```

The server validates `JWT_SECRET`, `ENCRYPTION_KEY`, and the database mode's required variables at boot, and exits immediately with a clear error if any are missing.

---

## Testing

```bash
npm test          # run the full suite once
npm run watch      # watch mode
npm run coverage   # coverage report
```

Point `.env.test` at a separate database (e.g. `helixacare_test`) before running — integration tests hit a real database.

---

## API Documentation

Swagger UI is served at:

```
http://localhost:5000/api-docs
```

---

## Project Structure

```
virtual-hospital-platform/
├── frontend/                       # React (Vite) SPA
│   └── src/
│       ├── api/                    # Axios modules, one per backend resource
│       ├── components/
│       │   ├── layout/             # Sidebar, Topbar, AppLayout
│       │   └── ui/                 # Reusable UI primitives
│       ├── contexts/                # Auth & theme context providers
│       ├── hooks/                   # useFetch, usePaginatedFetch, useTheme, ...
│       ├── pages/
│       │   ├── admin/               # Admin dashboards & management pages
│       │   ├── doctor/              # Doctor portal pages
│       │   ├── patient/             # Patient portal pages
│       │   ├── auth/                # Login / register
│       │   └── shared/              # Messages, notifications, profile
│       ├── router/                  # Route definitions & role guards
│       └── utils/
│
├── src/                             # Express backend
│   ├── app.js                       # Middleware & route registration
│   ├── config/                      # DB pool, Swagger config
│   ├── controllers/                 # One folder per domain area
│   │   └── databaseAdminBoard/      # Generic CRUD controllers backing the admin board
│   ├── middleware/                  # Auth, RBAC, rate limiting, uploads
│   ├── routes/                      # Express routers (mirrors controllers/)
│   ├── SQL Queries/
│   │   ├── ProductionSetup.sql      # Full schema + seed data
│   │   └── resetDemoData.sql        # Reset to clean demo data (re-runnable)
│   ├── utils/                       # Encryption, pagination, error handling
│   └── validators/                  # express-validator rule sets
│
├── tests/
│   ├── unit/
│   └── integration/                 # Hits a real database
│
├── server.js                        # Server entry point
├── env.example                      # Backend environment variable template
└── package.json
```

---

## Security

- **JWT** — verified on every protected route, with a revocation blacklist so logout is real
- **AES-256-GCM** — sensitive record content (medical record descriptions, prescription instructions) encrypted at rest
- **Database-level constraints** — a PostgreSQL exclusion constraint prevents doctor double-booking even under concurrent requests, not just an application-level check
- **Helmet** — secure HTTP headers, strict CSP in production
- **HTTPS redirect** — enforced in production behind a reverse proxy (Render, NGINX, etc.)
- **Rate limiting** — brute-force protection on login and general API traffic
- **bcrypt** — password hashing
- **express-validator** — input validation at every route boundary
- **CORS** — restricted to explicitly configured origins
- **Role-based access control** — enforced in middleware, with explicit ownership checks on patient/doctor-scoped resources

---

## Scope Note

This is a proof-of-concept build demonstrating the technical feasibility of an integrated virtual hospital platform. It is not a certified medical product — diagnosis and treatment remain the responsibility of qualified practitioners; AVA is a triage-and-navigation aid, not a diagnostic tool.

---

## License

Proprietary.
