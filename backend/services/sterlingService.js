const User = require('../models/User');
const { createAuditLog } = require('./auditService');
const { getPaymentsAdminEmails, getEvaluationAdminEmails } = require('../utils/adminRoleEmails');
const { sendTransactionalEmailSafe } = require('./emailService');
const { wrapHtml } = require('./emailTemplateService');

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

  if (mappedStatus === 'completed' && previous.backgroundCheckStatus !== 'completed') {
    const candidateName = candidate.name || candidate.email?.split('@')?.[0] || 'Candidate';
    const adminRecipients = [...new Set([...getPaymentsAdminEmails(), ...getEvaluationAdminEmails()])];

    const adminText = `Candidate verification has been successfully completed through the external verification process.

Candidate Name: ${candidateName}  
Candidate ID: ${candidate.candidateId || String(candidate._id)}

Verification Status: Cleared

The candidate profile has now progressed to the employer coordination and opportunity alignment stage.

Please proceed with the next operational steps as required.

Regards,  
NextStep Talent System Notification

This is an automated email. Please do not reply to this message.`;

    await sendTransactionalEmailSafe({
      to: adminRecipients,
      subject: 'NextStep Talent – Verification Successfully Completed',
      text: adminText,
      html: wrapHtml({
        title: 'Verification Successfully Completed',
        bodyHtml: adminText.replaceAll('\n', '<br/>'),
      }),
      fromEmail: 'noreply@nextsteptalent.net',
      fromName: 'NextStep Talent System Notification',
      templateKey: 'sterling_verification_completed_admin_notice',
      relatedCandidateId: candidate._id,
    });

    const candidateText = `Dear Candidate,

We are pleased to inform you that your verification process has been successfully completed.

Your profile has now progressed to the next phase of internal coordination and opportunity alignment.

Our team will continue with the next operational stages and will contact you should any additional information or actions be required.

We appreciate your cooperation throughout the verification process.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;

    await sendTransactionalEmailSafe({
      to: candidate.email,
      subject: 'NextStep Talent – Verification Successfully Completed',
      text: candidateText,
      html: candidateText.replaceAll('\n', '<br/>'),
      fromEmail: 'noreply@nextsteptalent.net',
      fromName: 'NextStep Talent Team',
      templateKey: 'sterling_verification_completed_candidate_notice',
      relatedCandidateId: candidate._id,
    });
  }

  return { updated: true, candidateId: candidate._id, status: mappedStatus };
};

module.exports = {
  initiateBackgroundCheck,
  getBackgroundCheckStatus,
  handleSterlingWebhook,
};
