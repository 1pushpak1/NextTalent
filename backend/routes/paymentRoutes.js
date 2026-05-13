const express = require('express');
const multer = require('multer');
const { createPaymentIntent, confirmPayment, submitBankTransferPayment, getMyPayments, getStage1Invoice, getStage2Invoice, uploadReceipt } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);
router.post('/bank-transfer', protect, (req, res, next) => {
  uploadReceipt.single('receipt')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 10MB limit' });
    }
    return res.status(400).json({ message: error.message || 'Upload failed' });
  });
}, submitBankTransferPayment);
router.get('/me', protect, getMyPayments);
router.get('/invoice/stage-1', protect, getStage1Invoice);
router.get('/invoice/stage-2', protect, getStage2Invoice);

module.exports = router;
