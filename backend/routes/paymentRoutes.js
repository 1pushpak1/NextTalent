const express = require('express');
const { createPaymentIntent, confirmPayment, getMyPayments } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);
router.get('/me', protect, getMyPayments);

module.exports = router;
