const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/triageSymptomRulesController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllTriageSymptomRules);
router.get('/:id', controller.getTriageSymptomRuleById);
router.post('/', controller.createTriageSymptomRule);
router.put('/:id', controller.updateTriageSymptomRule);
router.delete('/:id', controller.deleteTriageSymptomRule);

module.exports = router;
