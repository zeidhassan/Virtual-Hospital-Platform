const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/patientHealthProgramsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllPatientHealthPrograms);
router.get('/:id', controller.getPatientHealthProgramById);
router.post('/', controller.createPatientHealthProgram);
router.put('/:id', controller.updatePatientHealthProgram);
router.delete('/:id', controller.deletePatientHealthProgram);

module.exports = router;
