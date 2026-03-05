# MODIFIED/NEW FILES:

Backend:
- Doctor Subscription Module
  - controllers/doctor/doctorSubscriptionController
  - routes/doctor/doctorSubscriptions
  - middleware/checkPlanFeature
  - controllers/admin/adminDoctorPlansController
  - routes/admin/adminDoctorPlans
- Insurance Payment Module
  - controllers/payments/paymentsController
  - controllers/payments/subscriptionController
  - controllers/insurance/insuranceRequestsController
  - routes/insurance/insuranceRequests
  - controllers/admin/adminInsuranceController
  - routes/admin/adminInsurance
- Patient Questions Module:
  - controllers/questions/questionsController.js
  - routes/admin/questionsAdmin.js
  - routes/questions/questions.js
  - validators/questionsValidation.js
---
Frontend:
- Doctor Subscription Module:
  - public/doctor/view_plans
  - public/doctor/my-subscription
  - public/doctor/update-subsctiption
  - public/admin/admin-doctor-subscription
- Insurance Payment Module:
  - public/doctor/insurance-doctor
  - public/admin/insurance-admin
  - public/patient/insurance
- Patient Questions Module:
  - public/admin/questions.html
  - public/admin/suggested-questions.html
  - public/doctor/suggested-questions.html
  - public/patient/answer-questions.html

# 🏥 Virtual Hospital Platform - Back End System

Virtual Hospital Platform is a full-stack virtual healthcare platform built with Node.js, Express, PostgreSQL, and modern front-end tooling. It supports a complete digital hospital environment for **patients**, **doctors**, and **admin** users.

---

## 🚀 Features

- ✅ JWT & OAuth2 Authentication (Google, Facebook)
- ✅ Role-Based Access (Admin, Doctor, Patient)
- ✅ Appointment Booking & Doctor Availability
- ✅ Prescriptions & Medical Records Uploads
- ✅ Pharmacy Orders + Prescription Attachment
- ✅ Billing & Subscription Plans (PayPal Integration)
- ✅ Admin Analytics Dashboard
- ✅ Notification & Messaging System
- ✅ Secure file upload & form validation

---

## 📦 Tech Stack

| Layer         | Tech                       |
|---------------|----------------------------|
| Backend       | Node.js, Express           |
| Database      | PostgreSQL                 |
| Authentication| JWT, Passport (OAuth2)     |
| Frontend      | HTML/CSS (Templating Views)|
| Payments      | PayPal API                 |
| Testing       | Jest, Supertest            |
| API Docs      | Swagger (OpenAPI 3.0)      |

---

## ⚙️ Installation (Ignore if you have the zip folder, just extract)

```bash
git clone https://github.com/your-repo/virtual-hospital-platform.git
cd virtual-hospital-platform
npm install
cp env.example .env
```

Update your `.env` file with your configuration.

---

## 🛠 Environment Variables

```env
PORT=
DB_USER=
DB_HOST=
DB_DATABASE=
DB_PASSWORD=
DB_PORT=
DB_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=
FRONTEND_ORIGIN=
ENCRYPTION_KEY=
```

---

## 🧪 Testing

Add a ".env.test" file to your main directory with the value "NODE_ENV=test" inside

```bash
# Run tests
npm test

# Run test coverage
npm run coverage
```

---

## 🔐 Security Measures

- Role-based middleware (`requireRole`)
- Helmet middleware for HTTP headers
- HTTPS redirect in production
- Payload validation with `express-validator`
- Sensitive files excluded via `.gitignore`

---

## 🧱 Database Setup

To initialize production database:

```bash
psql -U your_user -d virtual_hospital_platform_production -f resetDemoData.sql
```

---

## 🗃 Folder Structure (Simplified)

```
virtual-hospital-platform/
├── coverage/ # Test coverage reports
│
├── node_modules/ # Installed dependencies
│
├── public/ # Static HTML pages & assets
│
├── src/ # Main source code
│ ├── config/ # App and DB config files
│ ├── controllers/ # Route logic & controller functions
│ ├── middleware/ # Auth & role-based middleware
│ ├── routes/ # API and view routes
│ ├── SQL Queries/ # Raw SQL setup/seed files
│ ├── utils/ # Reusable helper functions
│ ├── validators/ # Input validation logic
│ ├── app.js # Express app initialization
│
├── tests/ # Unit & integration test cases
│
├── .env # Environment variables
├── .env.test # Test-specific environment variables
├── index.js # Server bootstrap entry point
├── package.json # Project metadata and scripts
├── package-lock.json # Dependency lock file
└── README.md # Project documentation
```

---

## 📈 API Documentation

Visit `http://localhost:5000/api-docs` for full Swagger documentation. (can be reached through admin dashboard)

---

## 👤 Default Admin Credentials

```bash
Email: admin@virtualhospitalplatform.com
Password: admin123 (hashed in DB)
```

---

## 📄 License

This project is proprietary and licensed by the Virtual Hospital Platform team.
