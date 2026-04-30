const express = require('express');
const { listCandidates, updateCandidateStatus } = require('../controllers/dashboardController');
const {
  listCandidatesByStage,
  getDashboardSummary,
  getPaymentsOverview,
  listPaymentsByType,
  getCandidateDetails,
  updateCandidateProfileStatus,
  updateCandidateDocumentStatus,
  addCandidateInterview,
  updatePaymentStatus,
  updateCandidateNotes,
  updateCandidateStageDecision,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/candidates', protect, adminOnly, listCandidates);
router.get('/candidates/stage/:stageKey', protect, adminOnly, listCandidatesByStage);
router.put('/candidates/:id/status', protect, adminOnly, updateCandidateStatus);
router.get('/candidates/:id/details', protect, adminOnly, getCandidateDetails);
router.put('/candidates/:id/profile-status', protect, adminOnly, updateCandidateProfileStatus);
router.put('/candidates/:id/documents/:documentId/status', protect, adminOnly, updateCandidateDocumentStatus);
router.post('/candidates/:id/interviews', protect, adminOnly, addCandidateInterview);
router.put('/candidates/:id/notes', protect, adminOnly, updateCandidateNotes);
router.put('/candidates/:id/stage/:stageKey/decision', protect, adminOnly, updateCandidateStageDecision);

router.get('/dashboard/summary', protect, adminOnly, getDashboardSummary);
router.get('/payments/overview', protect, adminOnly, getPaymentsOverview);
router.get('/payments/:type', protect, adminOnly, listPaymentsByType);
router.put('/payments/:paymentId/status', protect, adminOnly, updatePaymentStatus);

module.exports = router;
