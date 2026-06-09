const express = require('express');
const {
  signup,
  login,
  validateActivation,
  verifyEmail,
  resendVerificationEmail,
  sendProfileEmailVerification,
  verifyPhone,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/account-activation', validateActivation);
router.post('/account-activation/validate', validateActivation);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-email', resendVerificationEmail);
router.post('/send-profile-email-verification', sendProfileEmailVerification);
router.post('/verify-phone', verifyPhone);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
