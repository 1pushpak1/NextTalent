const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  submitCandidateApplication,
  initiateSterlingVerification,
  getCandidatePayments,
  downloadCandidateInvoice,
  downloadCandidateReceipt,
  signCandidateConsents,
  getInterviewSlots,
  bookInterviewSlot,
} = require('../controllers/candidateController');

const router = express.Router();

router.post('/application/submit', protect, submitCandidateApplication);
router.post('/sterling/initiate', protect, initiateSterlingVerification);
router.get('/payments', protect, getCandidatePayments);
router.get('/invoices/:invoiceId/download', protect, downloadCandidateInvoice);
router.get('/receipts/:receiptId/download', protect, downloadCandidateReceipt);
router.post('/consents/sign', protect, signCandidateConsents);
router.get('/interview/slots', protect, getInterviewSlots);
router.post('/interview/book', protect, bookInterviewSlot);

module.exports = router;
