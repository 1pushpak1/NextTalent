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
  listAllCandidates,
  getAdminCandidateProfile,
} = require('../controllers/adminController');
const { protect, adminOnly, requireAdminPermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/candidates', protect, adminOnly, listCandidates);
router.get('/candidates/all', protect, adminOnly, requireAdminPermission('candidates:read'), listAllCandidates);
router.get('/candidates/stage/:stageKey', protect, adminOnly, listCandidatesByStage);
router.put('/candidates/:id/status', protect, adminOnly, updateCandidateStatus);
router.get('/candidates/:id/details', protect, adminOnly, getCandidateDetails);
router.get('/candidates/:id/profile', protect, adminOnly, requireAdminPermission('candidates:read'), getAdminCandidateProfile);
router.put('/candidates/:id/profile-status', protect, adminOnly, requireAdminPermission('evaluation:approve'), updateCandidateProfileStatus);
router.put('/candidates/:id/documents/:documentId/status', protect, adminOnly, requireAdminPermission('documents:verify'), updateCandidateDocumentStatus);
router.post('/candidates/:id/interviews', protect, adminOnly, requireAdminPermission('interviews:manage'), addCandidateInterview);
router.put('/candidates/:id/notes', protect, adminOnly, requireAdminPermission('notes:manage'), updateCandidateNotes);
router.put('/candidates/:id/stage/:stageKey/decision', protect, adminOnly, requireAdminPermission('candidates:update'), updateCandidateStageDecision);

router.get('/dashboard/summary', protect, adminOnly, requireAdminPermission('candidates:read'), getDashboardSummary);
router.get('/payments/overview', protect, adminOnly, getPaymentsOverview);
router.get('/payments/:type', protect, adminOnly, listPaymentsByType);
router.put('/payments/:paymentId/status', protect, adminOnly, requireAdminPermission('payments:verify'), updatePaymentStatus);

module.exports = router;
