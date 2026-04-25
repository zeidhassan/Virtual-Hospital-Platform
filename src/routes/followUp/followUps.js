const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const ctrl = require('../../controllers/followUp/followUpController');

router.use(verifyToken);

// Admin-only
router.post('/process-reminders', requireRole('admin'), ctrl.processReminders);
router.post('/process-missed',    requireRole('admin'), ctrl.processMissed);
router.get('/admin',              requireRole('admin'), ctrl.getAllFollowUps);

// Doctor or admin creates
router.post('/', requireRole(['doctor', 'admin']), ctrl.createFollowUp);

// Patient views own
router.get('/my', requireRole('patient'), ctrl.getMyFollowUps);

// Doctor views assigned
router.get('/doctor', requireRole('doctor'), ctrl.getDoctorFollowUps);

// Patient or doctor marks complete
router.put('/:id/complete', requireRole(['patient', 'doctor', 'admin']), ctrl.completeFollowUp);

// Doctor or admin cancels
router.put('/:id/cancel', requireRole(['doctor', 'admin']), ctrl.cancelFollowUp);

module.exports = router;
