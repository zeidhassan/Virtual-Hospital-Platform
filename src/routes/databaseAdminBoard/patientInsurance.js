const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/patientInsuranceController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllPatientInsurance);
router.get('/:id', controller.getPatientInsuranceById);
router.post('/', controller.createPatientInsurance);
router.put('/:id', controller.updatePatientInsurance);
router.delete('/:id', controller.deletePatientInsurance);

module.exports = router;
