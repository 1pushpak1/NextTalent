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
  const role = String(req.user?.adminRole || '');
  const isSuperAdmin = role === 'super_admin';
  if (!isSuperAdmin) return [];

  if (!canReadFullAudit(permissions) && !canReadLimitedAudit(permissions)) return [];
  return entries;
};

module.exports = {
  sanitizeReasonNote,
  getDecisionFromStatusChange,
  createApprovalAuditLog,
  filterAuditEntriesForAdmin,
};
