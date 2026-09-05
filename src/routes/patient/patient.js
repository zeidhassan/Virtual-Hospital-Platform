const express = require('express');
const router = express.Router();
const controller = require('../../controllers/patient/patientController');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const { uploadMedicalRecord, wrapUpload } = require('../../middleware/uploadMiddleware');

// Global token verification
router.use(verifyToken);

// Attach role guard only where needed
/**
 * @swagger
 * /api/patient/profile:
 *   get:
 *     summary: Get the patient profile
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientProfile'
 *       403:
 *         description: Unauthorized
 */
router.get('/profile', requireRole('patient'), controller.getPatientProfile);
/**
 * @swagger
 * /api/patient/dashboard-stats:
 *   get:
 *     summary: Get dashboard statistics for the patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientDashboardStats'
 */
router.get('/dashboard-stats', requireRole('patient'), controller.getPatientDashboardStats);
/**
 * @swagger
 * /api/patient/appointments:
 *   get:
 *     summary: Get all appointments for the patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 */
router.get('/appointments', requireRole('patient'), controller.getAppointments);
/**
 * @swagger
 * /api/patient/doctor-details/{doctorId}:
 *   get:
 *     summary: Get details of a doctor by ID
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: Doctor details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Doctor'
 *       404:
 *         description: Doctor not found
 */
router.get('/doctor-details/:doctorId', requireRole('patient'), controller.getDoctorDetailsById);
/**
 * @swagger
 * /api/patient/prescriptions:
 *   get:
 *     summary: Get prescriptions for the patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of prescriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prescription'
 */
router.get('/prescriptions', requireRole('patient'), controller.getPrescriptions);
router.post('/prescriptions/:id/refill', requireRole('patient'), controller.requestRefill);
/**
 * @swagger
 * /api/patient/all-medications:
 *   get:
 *     summary: Get all available medications
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of medications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Medication'
 */
router.get('/all-medications', requireRole('patient'), controller.getAllMedications);
/**
 * @swagger
 * /api/patient/medication-details/{id}:
 *   get:
 *     summary: Get medication details by ID
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Medication ID
 *     responses:
 *       200:
 *         description: Medication details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Medication'
 *       404:
 *         description: Medication not found
 */
router.get('/medication-details/:id', requireRole('patient'), controller.getMedicationById);
/**
 * @swagger
 * /api/patient/records:
 *   get:
 *     summary: Get all medical records for the patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of medical records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MedicalRecord'
 */
router.get('/records', requireRole('patient'), controller.getMedicalRecords);
router.post('/records', requireRole('patient'), wrapUpload(uploadMedicalRecord, 'medical_record_file'), controller.uploadMedicalRecord);

/**
 * @swagger
 * /api/patients/user/{userId}:
 *   get:
 *     summary: Get patient ID by user ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID from users table
 *     responses:
 *       200:
 *         description: Returns patient_id
 *       403:
 *         description: Unauthorized
 */
router.get('/user/:userId', async (req, res, next) => {
  // Allow access only if requesting their own ID
  if (parseInt(req.params.userId) !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. Requires your own token.' });
  }
  controller.getPatientByUserId(req, res, next);
});

module.exports = router;
