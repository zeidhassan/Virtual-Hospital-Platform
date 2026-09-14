const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/healthPrograms/patientHealthProgramsController');
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');

router.use(verifyToken);
router.use(requireRole('patient'));

// Static routes before the /:id param route, matching this project's
// established route-ordering convention.
router.get('/my', ctrl.myPrograms);
router.get('/', ctrl.listPrograms);
router.post('/:id/enroll', ctrl.enroll);
router.delete('/:id/enroll', ctrl.unenroll);

module.exports = router;
