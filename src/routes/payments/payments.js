const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const requireRole = require('../../middleware/requireRole');
const { getFpxBanks, getMyBills, payBill, getMyTransactions } = require('../../controllers/payments/paymentsController');
const { listMethods, saveMethod, setDefault, deleteMethod } = require('../../controllers/payments/paymentMethodsController');
const { getBillingAddress, saveBillingAddress } = require('../../controllers/payments/billingAddressController');

router.use(verifyToken);

// FPX bank list
router.get('/fpx-banks', getFpxBanks);

// Patient bill payment
router.get('/bills/my', requireRole('patient'), getMyBills);
router.post('/pay', requireRole('patient'), payBill);
router.get('/transactions', getMyTransactions);

// Saved payment methods (all roles)
router.get('/methods', listMethods);
router.post('/methods', saveMethod);
router.put('/methods/:id/default', setDefault);
router.delete('/methods/:id', deleteMethod);

// Billing address (all roles)
router.get('/billing-address', getBillingAddress);
router.post('/billing-address', saveBillingAddress);

module.exports = router;
