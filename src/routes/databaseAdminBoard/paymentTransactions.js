const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/paymentTransactionsController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllPaymentTransactions);
router.get('/:id', controller.getPaymentTransactionById);
router.post('/', controller.createPaymentTransaction);
router.put('/:id', controller.updatePaymentTransaction);
router.delete('/:id', controller.deletePaymentTransaction);

module.exports = router;
