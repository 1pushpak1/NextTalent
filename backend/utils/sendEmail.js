const { sendTransactionalEmailSafe } = require('../services/emailService');

const isStrictMode = () => String(process.env.EMAIL_STRICT_MODE || 'false').toLowerCase() === 'true';

const sendEmail = async ({
  to,
  subject,
  text,
  html,
  attachments = [],
  fromEmail,
  fromName,
  cc,
  bcc,
  templateKey = 'legacy_generic',
  relatedCandidateId = null,
  relatedAdminActionId = '',
}) => {
  const result = await sendTransactionalEmailSafe({
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    attachments,
    fromEmail,
    fromName,
    templateKey,
    relatedCandidateId,
    relatedAdminActionId,
  });

  if (!result.ok) {
    if (isStrictMode()) {
      throw result.error;
    }
    return {
      accepted: [],
      rejected: Array.isArray(to) ? to : [to],
      messageId: `email-suppressed-${Date.now()}`,
      warning: result.error?.message || 'Email delivery failed',
    };
  }

  return result.info;
};

module.exports = sendEmail;
