const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const ctrl = require('../../controllers/consultationHistory/consultationHistoryController');

router.use(verifyToken);

router.get('/patient/:patientId',         requireRole(['patient', 'doctor', 'admin']), ctrl.getTimeline);
router.get('/patient/:patientId/summary', requireRole(['patient', 'doctor', 'admin']), ctrl.getSummary);

module.exports = router;
