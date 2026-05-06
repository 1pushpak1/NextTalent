const express = require('express');
const { signup, login, verifyEmail, resendVerificationEmail, verifyPhone } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-email', resendVerificationEmail);
router.post('/verify-phone', verifyPhone);

module.exports = router;
