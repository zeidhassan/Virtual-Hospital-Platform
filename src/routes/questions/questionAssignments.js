const express = require('express');
const router = express.Router();
const controller = require('../../controllers/questions/questionAssignmentsController');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');

router.use(verifyToken);

router.post('/', requireRole('doctor'), controller.assignQuestions);
router.get('/my', requireRole('patient'), controller.getMyAssignments);
router.get('/patient/:patientId', requireRole('doctor'), controller.getAssignmentsForPatient);
router.get('/admin', requireRole('admin'), controller.getAllAssignments);

module.exports = router;
