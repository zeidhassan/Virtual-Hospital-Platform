// routes/admin/admin.js
//
// This module used to host GET /api/admin/passwords, which exposed every
// user's plaintext password via user_passwords — that table and endpoint
// have been removed entirely (see src/controllers/authentication/authController.js
// for where the plaintext write used to happen). Left as an empty router
// since app.js still mounts '/api/admin' here.
const express = require('express');
const router = express.Router();

module.exports = router;
