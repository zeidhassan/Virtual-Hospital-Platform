const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const ctrl = require('../../controllers/healthLogs/healthLogController');

router.use(verifyToken);

router.post('/',                     requireRole('patient'),        ctrl.createHealthLog);
router.get('/my',                    requireRole('patient'),        ctrl.getMyHealthLogs);
router.get('/patient/:patientId',    requireRole(['doctor', 'admin']), ctrl.getPatientHealthLogs);

module.exports = router;
