import api from './axios';

export const fetchAdminCandidates = (params) => api.get('/admin/candidates/all', { params });
export const fetchAdminCandidateProfile = (id) => api.get(`/admin/candidates/${id}/profile`);
export const fetchAdminDashboardSummary = () => api.get('/admin/dashboard/summary');
export const fetchApprovalAuditHistory = (candidateId) => api.get(`/admin/approval-audit/${candidateId}`);
export const reviewCandidateProfile = (candidateId, payload) => api.put(`/admin/candidates/${candidateId}/profile-status`, payload);
export const reviewCandidateDocument = (candidateId, documentId, payload) => api.put(`/admin/candidates/${candidateId}/documents/${documentId}/status`, payload);
export const reviewPayment = (paymentId, payload) => api.put(`/admin/payments/${paymentId}/status`, payload);
export const reviewCandidateStage = (candidateId, stageKey, payload) => api.put(`/admin/candidates/${candidateId}/stage/${stageKey}/decision`, payload);
export const updateCandidateNotes = (candidateId, payload) => api.put(`/admin/candidates/${candidateId}/notes`, payload);
export const scheduleCandidateInterview = (candidateId, payload) => api.post(`/admin/candidates/${candidateId}/interviews`, payload);
