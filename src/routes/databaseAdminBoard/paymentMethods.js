const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/paymentMethodsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllPaymentMethods);
router.get('/:id', controller.getPaymentMethodById);
router.post('/', controller.createPaymentMethod);
router.put('/:id', controller.updatePaymentMethod);
router.delete('/:id', controller.deletePaymentMethod);

module.exports = router;
