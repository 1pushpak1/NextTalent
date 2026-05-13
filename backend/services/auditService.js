const AuditLog = require('../models/AuditLog');

const getRequestIp = (req) => {
  const forwardedFor = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req?.ip || req?.socket?.remoteAddress || '';
};

const createAuditLog = async ({
  req,
  actorType = 'system',
  actorId = '',
  actorRole = '',
  candidateId,
  action,
  previousValue = null,
  newValue = null,
  metadata = {},
}) => {
  if (!action) return null;

  return AuditLog.create({
    actorType,
    actorId: String(actorId || ''),
    actorRole: String(actorRole || ''),
    candidateId: candidateId || null,
    action: String(action),
    previousValue,
    newValue,
    metadata,
    ipAddress: getRequestIp(req),
    userAgent: String(req?.headers?.['user-agent'] || ''),
  });
};

module.exports = {
  getRequestIp,
  createAuditLog,
};
