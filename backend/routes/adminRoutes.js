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
  getApprovalAuditHistory,
  initiateDocumentationStage,
  initiateCandidatePaymentInstruction,
  initiateCandidateRefund,
} = require('../controllers/adminController');
const {
  evaluationApprove: legacyEvaluationApprove,
  evaluationReject: legacyEvaluationReject,
  operationsDecision,
  initiateSterlingForCandidate,
  selectedCandidate,
  sendNotSelectedEmailFromAdmin,
  generateInvoiceForCandidate,
  verifyCandidatePayment,
  createInterviewSlot,
  listInterviewBookings,
  sendTestEmail,
} = require('../controllers/adminWorkflowController');
const {
  evaluationApprove,
  evaluationReject,
  operationsApprove,
  operationsReject,
} = require('../controllers/adminApprovalController');
const { ADMIN_ROLES } = require('../constants/workflow');
const { protect, adminOnly, requireAdminPermission, requireAdminRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/candidates', protect, adminOnly, listCandidates);
router.get('/candidates/all', protect, adminOnly, requireAdminPermission('candidates:read'), listAllCandidates);
router.get('/candidates/stage/:stageKey', protect, adminOnly, listCandidatesByStage);
router.put('/candidates/:id/status', protect, adminOnly, updateCandidateStatus);
router.get('/candidates/:id/details', protect, adminOnly, getCandidateDetails);
router.get('/candidates/:id/profile', protect, adminOnly, requireAdminPermission('candidates:read'), getAdminCandidateProfile);
router.get('/approval-audit/:candidateId', protect, adminOnly, getApprovalAuditHistory);
router.put('/candidates/:id/profile-status', protect, adminOnly, requireAdminPermission('evaluation:approve'), updateCandidateProfileStatus);
router.put('/candidates/:id/documents/:documentId/status', protect, adminOnly, requireAdminPermission('documents:verify'), updateCandidateDocumentStatus);
router.post('/candidates/:id/interviews', protect, adminOnly, requireAdminPermission('interviews:manage'), addCandidateInterview);
router.put('/candidates/:id/notes', protect, adminOnly, requireAdminPermission('notes:manage'), updateCandidateNotes);
router.put('/candidates/:id/stage/:stageKey/decision', protect, adminOnly, requireAdminPermission('candidates:update'), updateCandidateStageDecision);

router.get('/dashboard/summary', protect, adminOnly, requireAdminPermission('candidates:read'), getDashboardSummary);
router.get('/payments/overview', protect, adminOnly, getPaymentsOverview);
router.get('/payments/:type', protect, adminOnly, listPaymentsByType);
router.put('/payments/:paymentId/status', protect, adminOnly, requireAdminPermission('payments:verify'), updatePaymentStatus);

// New dual approval workflow routes
router.post('/candidates/:id/evaluation/approve', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.EVALUATION_ADMIN, ADMIN_ROLES.SUPER_ADMIN]), evaluationApprove);
router.post('/candidates/:id/evaluation/reject', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.EVALUATION_ADMIN, ADMIN_ROLES.SUPER_ADMIN]), evaluationReject);
router.post('/candidates/:id/operations/approve', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.OPERATIONS_ADMIN, ADMIN_ROLES.SUPER_ADMIN]), operationsApprove);
router.post('/candidates/:id/operations/reject', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.OPERATIONS_ADMIN, ADMIN_ROLES.SUPER_ADMIN]), operationsReject);

// Legacy routes (kept for backward compatibility)
router.post('/candidates/:id/operations/decision', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.OPERATIONS_ADMIN, ADMIN_ROLES.SUPER_ADMIN]), operationsDecision);
router.post('/candidates/:id/sterling/initiate', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.OPERATIONS_ADMIN, ADMIN_ROLES.SUPER_ADMIN]), initiateSterlingForCandidate);
router.post('/candidates/:id/selected', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), selectedCandidate);
router.post('/candidates/:id/not-selected', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), sendNotSelectedEmailFromAdmin);
router.post('/candidates/:id/invoices/generate', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.EVALUATION_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN]), generateInvoiceForCandidate);
router.post('/candidates/:id/payments/:paymentId/verify', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.EVALUATION_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN]), verifyCandidatePayment);
router.post('/candidates/:id/documents/initiate', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.EVALUATION_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN]), initiateDocumentationStage);
router.post('/candidates/:id/payments/instructions', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.EVALUATION_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN]), initiateCandidatePaymentInstruction);
router.post('/candidates/:id/refunds/initiate', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN]), initiateCandidateRefund);
router.post('/interview-slots', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.OPERATIONS_ADMIN, ADMIN_ROLES.SUPER_ADMIN]), createInterviewSlot);
router.get('/interview-bookings', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.OPERATIONS_ADMIN, ADMIN_ROLES.SUPER_ADMIN]), listInterviewBookings);
router.post('/test-email', protect, adminOnly, requireAdminRoles([ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.EVALUATION_ADMIN, ADMIN_ROLES.OPERATIONS_ADMIN]), sendTestEmail);

module.exports = router;
