const express = require('express');
const router = express.Router();
const controller = require('../../controllers/databaseAdminBoard/billingAddressesController');
const requireRole = require('../../middleware/requireRole');
const verifyToken = require('../../middleware/verifyToken');
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/', controller.getAllBillingAddresses);
router.get('/:id', controller.getBillingAddressById);
router.post('/', controller.createBillingAddress);
router.put('/:id', controller.updateBillingAddress);
router.delete('/:id', controller.deleteBillingAddress);

module.exports = router;
