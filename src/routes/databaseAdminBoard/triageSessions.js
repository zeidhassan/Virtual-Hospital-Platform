const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/triageSessionsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllTriageSessions);
router.get('/:id', controller.getTriageSessionById);
router.post('/', controller.createTriageSession);
router.put('/:id', controller.updateTriageSession);
router.delete('/:id', controller.deleteTriageSession);

module.exports = router;
