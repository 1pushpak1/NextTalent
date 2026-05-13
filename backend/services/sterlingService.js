const User = require('../models/User');
const { createAuditLog } = require('./auditService');

const isMockMode = () => String(process.env.STERLING_MOCK_MODE || 'false').toLowerCase() === 'true';

const assertConfiguredOrMock = () => {
  if (isMockMode()) return;
  const required = ['STERLING_API_BASE_URL', 'STERLING_API_KEY', 'STERLING_CLIENT_ID', 'STERLING_CLIENT_SECRET'];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) {
    throw new Error(`Sterling is not configured. Missing: ${missing.join(', ')}`);
  }
};

const initiateBackgroundCheck = async (candidateId, options = {}) => {
  const candidate = await User.findById(candidateId);
  if (!candidate) throw new Error('Candidate not found');

  assertConfiguredOrMock();

  const startedAt = new Date();
  const mock = isMockMode();
  const referenceId = mock
    ? `MOCK-STERLING-${Date.now()}`
    : `TODO-REAL-STERLING-REF-${Date.now()}`;

  candidate.backgroundCheckProvider = 'Sterling';
  candidate.backgroundCheckStatus = mock ? 'completed' : 'initiated';
  candidate.backgroundCheckReferenceId = referenceId;
  candidate.backgroundCheckInitiatedAt = startedAt;
  candidate.backgroundCheckCompletedAt = mock ? startedAt : null;
  await candidate.save();

  return {
    provider: 'Sterling',
    status: candidate.backgroundCheckStatus,
    referenceId,
    initiatedAt: startedAt,
    completedAt: candidate.backgroundCheckCompletedAt,
    // TODO: Replace with real Sterling API request/response mapping.
  };
};

const getBackgroundCheckStatus = async (candidateId) => {
  const candidate = await User.findById(candidateId).lean();
  if (!candidate) throw new Error('Candidate not found');

  return {
    provider: candidate.backgroundCheckProvider || 'Sterling',
    status: candidate.backgroundCheckStatus || 'not_started',
    referenceId: candidate.backgroundCheckReferenceId || '',
    initiatedAt: candidate.backgroundCheckInitiatedAt || null,
    completedAt: candidate.backgroundCheckCompletedAt || null,
  };
};

const handleSterlingWebhook = async (payload, req = null) => {
  const referenceId = String(payload?.referenceId || payload?.candidateReference || '').trim();
  if (!referenceId) {
    throw new Error('Sterling webhook payload missing referenceId');
  }

  const normalizedStatus = String(payload?.status || '').toLowerCase();
  let mappedStatus = 'in_progress';
  if (['completed', 'clear', 'passed'].includes(normalizedStatus)) mappedStatus = 'completed';
  if (['failed', 'consider', 'error'].includes(normalizedStatus)) mappedStatus = 'failed';
  if (['rejected', 'declined'].includes(normalizedStatus)) mappedStatus = 'rejected';

  const candidate = await User.findOne({ backgroundCheckReferenceId: referenceId });
  if (!candidate) return { updated: false };

  const previous = {
    backgroundCheckStatus: candidate.backgroundCheckStatus || 'not_started',
    backgroundCheckCompletedAt: candidate.backgroundCheckCompletedAt || null,
  };

  candidate.backgroundCheckStatus = mappedStatus;
  if (mappedStatus === 'completed') {
    candidate.backgroundCheckCompletedAt = new Date();
  }
  await candidate.save();

  await createAuditLog({
    req,
    actorType: 'system',
    actorId: 'sterling_webhook',
    actorRole: 'system',
    candidateId: candidate._id,
    action: 'sterling_status_update',
    previousValue: previous,
    newValue: {
      backgroundCheckStatus: candidate.backgroundCheckStatus,
      backgroundCheckCompletedAt: candidate.backgroundCheckCompletedAt,
    },
    metadata: payload || {},
  });

  return { updated: true, candidateId: candidate._id, status: mappedStatus };
};

module.exports = {
  initiateBackgroundCheck,
  getBackgroundCheckStatus,
  handleSterlingWebhook,
};
