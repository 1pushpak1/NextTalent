const sendEmail = require('./sendEmail');
const { getPaymentsAdminEmails, getEvaluationAdminEmails, getOperationsAdminEmails } = require('./adminRoleEmails');

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const getWorkflowConfig = () => {
  const defaultSmtpFromEmail = String(process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || '').trim();

  const paymentsAdmins = getPaymentsAdminEmails();
  const evaluationAdmins = getEvaluationAdminEmails();
  const operationsAdmins = getOperationsAdminEmails();

  const admin12List = [...new Set([...paymentsAdmins, ...evaluationAdmins])];

  return {
    paymentsAdmins,
    evaluationAdmins,
    operationsAdmins,
    admin12List,
    admin1: paymentsAdmins[0] || '',
    admin2: evaluationAdmins[0] || '',
    admin3: operationsAdmins[0] || '',
    noreplyFromEmail: defaultSmtpFromEmail,
    teamFromEmail: defaultSmtpFromEmail,
  };
};

const sendWorkflowEmail = async ({
  to,
  subject,
  text,
  html,
  fromType = 'noreply',
  templateKey = 'workflow_generic',
  relatedCandidateId = null,
  relatedAdminActionId = '',
}) => {
  const config = getWorkflowConfig();
  const fromEmail = fromType === 'team' ? config.teamFromEmail : config.noreplyFromEmail;
  const recipients = Array.isArray(to)
    ? [...new Set(to.map((entry) => normalizeEmail(entry)).filter(Boolean))]
    : [normalizeEmail(String(to || ''))].filter(Boolean);
  if (!recipients.length) return;
  if (!fromEmail) {
    throw new Error('Workflow email sender is not configured. Set SMTP_FROM_EMAIL or SMTP_USERNAME.');
  }

  const delivery = await Promise.allSettled(
    recipients.map((recipient) =>
      sendEmail({
        to: recipient,
        subject,
        text,
        html: html || `<p>${String(text || '').replaceAll('\n', '<br/>')}</p>`,
        fromEmail,
        fromName: 'NextStep Talent',
        templateKey,
        relatedCandidateId,
        relatedAdminActionId,
      })
    )
  );

  const failed = delivery
    .map((result, index) => ({ result, recipient: recipients[index] }))
    .filter((item) => item.result.status === 'rejected')
    .map((item) => ({
      recipient: item.recipient,
      error: item.result.reason?.message || 'Unknown send error',
    }));

  if (failed.length) {
    const sentCount = recipients.length - failed.length;
    return {
      sent: sentCount,
      total: recipients.length,
      failures: failed,
      error: `Workflow email delivery partial failure. sent=${sentCount}/${recipients.length}; failures=${failed
        .map((entry) => `${entry.recipient}: ${entry.error}`)
        .join(' | ')}`,
    };
  }
  return { sent: recipients.length, total: recipients.length, failures: [] };
};

const sendAdminNotification = async ({
  to,
  subject,
  lines = [],
  fromType = 'noreply',
  templateKey = 'admin_notification',
  relatedCandidateId = null,
}) => {
  const text = lines.join('\n');
  await sendWorkflowEmail({ to, subject, text, fromType, templateKey, relatedCandidateId });
};

module.exports = {
  getWorkflowConfig,
  sendWorkflowEmail,
  sendAdminNotification,
  normalizeEmail,
};
