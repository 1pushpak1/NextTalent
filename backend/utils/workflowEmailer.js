const sendEmail = require('./sendEmail');

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const getWorkflowConfig = () => {
  const admin1 = normalizeEmail(process.env.SUPER_ADMIN_EMAIL || process.env.NEXTSTEP_ADMIN_1_EMAIL || 'globetrotts@gmail.com');
  const admin2 = normalizeEmail(process.env.PAYMENT_ADMIN_EMAIL || process.env.NEXTSTEP_ADMIN_2_EMAIL || 'dtyagi1978@gmail.com');
  const admin3 = normalizeEmail(process.env.EVALUATION_ADMIN_EMAIL || process.env.NEXTSTEP_ADMIN_3_EMAIL || 'arnabose212@gmail.com');
  const defaultSmtpFromEmail = String(process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || '').trim();
  const noreplyFromEmail = String(process.env.NOREPLY_FROM_EMAIL || defaultSmtpFromEmail).trim();
  const teamFromEmail = String(process.env.TEAM_FROM_EMAIL || defaultSmtpFromEmail).trim();
  const admin12List = [...new Set([admin1, admin2].filter(Boolean))];

  return {
    admin1,
    admin2,
    admin3,
    admin12List,
    noreplyFromEmail,
    teamFromEmail,
  };
};

const sendWorkflowEmail = async ({
  to,
  subject,
  text,
  html,
  fromType = 'noreply',
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
    throw new Error(
      `Workflow email delivery partial failure. sent=${sentCount}/${recipients.length}; failures=${failed
        .map((entry) => `${entry.recipient}: ${entry.error}`)
        .join(' | ')}`
    );
  }
};

const sendAdminNotification = async ({
  to,
  subject,
  lines = [],
  fromType = 'noreply',
}) => {
  const text = lines.join('\n');
  await sendWorkflowEmail({ to, subject, text, fromType });
};

module.exports = {
  getWorkflowConfig,
  sendWorkflowEmail,
  sendAdminNotification,
  normalizeEmail,
};
