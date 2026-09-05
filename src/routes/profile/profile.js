const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const { uploadProfilePicture, wrapUpload } = require('../../middleware/uploadMiddleware');
const ctrl = require('../../controllers/profile/profileController'); // adjust path

// The frontend calls the bare collection path (GET/PATCH /api/profile); keep
// /me and /update-profile too since they're already documented via Swagger.
router.get('/', verifyToken, ctrl.getMyProfile);
router.patch('/', verifyToken, ctrl.updateProfile);
router.patch('/picture', verifyToken, wrapUpload(uploadProfilePicture, 'profile_picture'), ctrl.uploadProfilePicture);

/**
 * @swagger
 * /profile/me:
 *   get:
 *     summary: Get the current user's profile
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 */
router.get('/me', verifyToken, ctrl.getMyProfile);
/**
 * @swagger
 * /profile/update-profile:
 *   patch:
 *     summary: Update the current user's profile
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfileUpdate'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 */
router.patch('/update-profile', verifyToken, ctrl.updateProfile);
/**
 * @swagger
 * /profile/create-billing-address:
 *   post:
 *     summary: Create a new billing address for the user
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BillingAddress'
 *     responses:
 *       201:
 *         description: Billing address created
 *       400:
 *         description: Invalid input
 */
router.post('/create-billing-address', verifyToken, ctrl.createBillingAddress);
/**
 * @swagger
 * /profile/update-billing-address/{id}:
 *   patch:
 *     summary: Update an existing billing address
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Billing address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BillingAddress'
 *     responses:
 *       200:
 *         description: Billing address updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Address not found
 */
router.patch('/update-billing-address/:id', verifyToken, ctrl.updateBillingAddress);
/**
 * @swagger
 * /profile/update-payment-method/{id}:
 *   patch:
 *     summary: Update a user's payment method
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment method ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentMethod'
 *     responses:
 *       200:
 *         description: Payment method updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Payment method not found
 */
router.patch('/update-payment-method/:id', verifyToken, ctrl.updatePaymentMethod);


module.exports = router;

