import api from './axios';

export const fetchAdminCandidates = (params) => api.get('/admin/candidates/all', { params });
export const fetchAdminCandidateProfile = (id) => api.get(`/admin/candidates/${id}/profile`);
export const fetchAdminDashboardSummary = () => api.get('/admin/dashboard/summary');
