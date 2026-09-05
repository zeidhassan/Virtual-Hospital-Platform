const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/healthLogsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllHealthLogs);
router.get('/:id', controller.getHealthLogById);
router.post('/', controller.createHealthLog);
router.put('/:id', controller.updateHealthLog);
router.delete('/:id', controller.deleteHealthLog);

module.exports = router;
