// src/config/swagger.js

const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HelixaCare API',
      version: '1.0.0',
      description: 'API documentation for HelixaCare',
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'Login, registration, profiles' },
      { name: 'Patients', description: 'Endpoints for patient activities' },
      { name: 'Doctors', description: 'Doctor-specific endpoints' },
      { name: 'Appointments', description: 'Appointment booking and tracking' },
      { name: 'Prescriptions', description: 'Prescription uploads and downloads' },
      { name: 'Billing', description: 'Bills, payments, and subscriptions' },
      { name: 'Support Tickets', description: 'Help and support' },
      { name: 'Pharmacy Orders', description: 'Prescription-based order tracking' },
      { name: 'Medical Records', description: 'Health records management' },
      { name: 'Admin', description: 'Admin dashboard and database actions' }
    ]
  },
  // Corrected path based on new location
  apis: [path.join(__dirname, '../routes/**/*.js')],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
