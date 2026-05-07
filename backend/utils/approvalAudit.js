const ApprovalAuditLog = require('../models/ApprovalAuditLog');

const sanitizeReasonNote = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 2000);

const getDecisionFromStatusChange = (previousStatus, newStatus) => {
  const previous = String(previousStatus || '').toLowerCase();
  const next = String(newStatus || '').toLowerCase();
  if (['accepted', 'completed', 'selected', 'verified'].includes(next)) return 'approved';
  if (['rejected', 'failed', 'needs revision', 'not_selected'].includes(next)) return 'rejected';
  if (previous === next) return 'pending';
  return 'changed';
};

const createApprovalAuditLog = async (req, payload) => {
  const candidateId = payload?.candidateId;
  if (!candidateId) throw new Error('candidateId is required for audit logging');

  return ApprovalAuditLog.create({
    candidateId,
    candidateEmail: String(payload?.candidateEmail || ''),
    approvalType: String(payload?.approvalType || 'stage_action'),
    sectionRecordId: String(payload?.sectionRecordId || ''),
    previousStatus: String(payload?.previousStatus || ''),
    newStatus: String(payload?.newStatus || ''),
    decision: payload?.decision || getDecisionFromStatusChange(payload?.previousStatus, payload?.newStatus),
    reasonNote: sanitizeReasonNote(payload?.reasonNote),
    adminRole: String(req.user?.adminRole || ''),
    adminName: String(req.user?.name || ''),
    adminEmail: String(req.user?.email || ''),
    adminIdentifier: String(req.user?.id || req.user?._id || req.user?.email || ''),
    ipAddress: String(req.ip || ''),
    userAgent: String(req.headers['user-agent'] || ''),
    sourcePage: String(payload?.sourcePage || ''),
  });
};

const canReadFullAudit = (permissions = []) => permissions.includes('approval:read_audit_full');
const canReadLimitedAudit = (permissions = []) => permissions.includes('approval:read_audit_limited');

const filterAuditEntriesForAdmin = (entries = [], req) => {
  const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
  if (canReadFullAudit(permissions)) return entries;
  if (!canReadLimitedAudit(permissions)) return [];

  const role = String(req.user?.adminRole || '');
  const allowedTypesByRole = {
    evaluation_admin: ['profile_evaluation', 'document_verification', 'interview_selection', 'final_selection', 'stage_action'],
    operations_admin: ['interview_selection', 'final_selection', 'stage_action'],
  };
  const allowedTypes = allowedTypesByRole[role] || [];

  return entries
    .filter((entry) => allowedTypes.includes(String(entry.approvalType || '')))
    .map((entry) => ({
      ...entry,
      ipAddress: '',
      userAgent: '',
      adminEmail: role === 'operations_admin' ? '' : entry.adminEmail,
    }));
};

module.exports = {
  sanitizeReasonNote,
  getDecisionFromStatusChange,
  createApprovalAuditLog,
  filterAuditEntriesForAdmin,
};
