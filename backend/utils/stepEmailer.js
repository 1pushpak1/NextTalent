const fs = require('fs');
const path = require('path');
const sendEmail = require('./sendEmail');

const getFrontendBaseUrl = () => String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const BRAND_LOGO_CID = 'nextstep-talent-logo';
const getBrandLogoUrl = () => process.env.BRAND_LOGO_URL || `${getFrontendBaseUrl()}/logo.png`;
const getBrandLogoPath = () => process.env.BRAND_LOGO_PATH || path.resolve(__dirname, '../../frontend/public/logo.png');
const logoFileExists = () => {
  try {
    return fs.existsSync(getBrandLogoPath());
  } catch {
    return false;
  }
};

const statusLabelMap = {
  submitted: 'Submitted',
  accepted: 'Approved',
  rejected: 'Rejected',
  under_review: 'Under Review',
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Not Received',
  uploaded: 'Uploaded',
};

const stepCatalog = {
  eligibility: { no: 1, name: 'Eligibility Check' },
  account: { no: 2, name: 'Account Setup' },
  profile: { no: 3, name: 'Profile Submission' },
  evaluation: { no: 4, name: 'Internal Evaluation' },
  initial_payment: { no: 5, name: 'Initial Payment' },
  declaration: { no: 6, name: 'Declaration & Contract' },
  onboarding: { no: 7, name: 'Team Contact / Onboarding' },
  documents: { no: 8, name: 'Documents Upload' },
  program_payment: { no: 9, name: 'Program Fee Payment' },
  document_verification: { no: 10, name: 'Document Verification' },
  hiring: { no: 11, name: 'Hiring Partner Stage' },
  interviews: { no: 12, name: 'Interviews' },
  selection: { no: 13, name: 'Selection Result' },
  final_payment: { no: 14, name: 'Final Payment' },
  testimonial: { no: 15, name: 'Testimonial' },
};

const variantThemes = {
  general: {
    chipBg: '#eef2ff',
    chipText: '#1e3a8a',
    cardBg: '#f8fafc',
    cardBorder: '#e2e8f0',
    title: 'Process Update',
  },
  payment: {
    chipBg: '#ecfdf3',
    chipText: '#166534',
    cardBg: '#f0fdf4',
    cardBorder: '#bbf7d0',
    title: 'Payment Update',
  },
  rejection: {
    chipBg: '#fef2f2',
    chipText: '#b91c1c',
    cardBg: '#fff1f2',
    cardBorder: '#fecdd3',
    title: 'Important Decision Update',
  },
  interview: {
    chipBg: '#eff6ff',
    chipText: '#1d4ed8',
    cardBg: '#f8fbff',
    cardBorder: '#bfdbfe',
    title: 'Interview Update',
  },
};

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const titleCase = (value = '') =>
  String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const stepInfoFor = (stepKey, fallbackName = 'Process Update') => {
  const base = stepCatalog[stepKey] || null;
  if (base) return base;
  return { no: '—', name: fallbackName };
};

const inferVariant = ({ eventType, stepKey, status }) => {
  if (eventType && variantThemes[eventType]) return eventType;
  const normalizedStep = String(stepKey || '').toLowerCase();
  const normalizedStatus = String(status || '').toLowerCase();
  if (normalizedStatus.includes('reject') || normalizedStatus.includes('failed')) return 'rejection';
  if (normalizedStep.includes('payment')) return 'payment';
  if (normalizedStep === 'interviews') return 'interview';
  return 'general';
};

const buildHtml = ({ candidateName, heading, message, stepNo, stepName, status, details = [], cta, variant = 'general', logoSrc }) => {
  const theme = variantThemes[variant] || variantThemes.general;
  const detailsHtml = details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse;background:${theme.cardBg};border:1px solid ${theme.cardBorder};border-radius:10px;padding:10px">${details
        .map(
          (row) =>
            `<tr><td style="padding:8px 0;color:#5a6472;font-size:13px;width:36%">${escapeHtml(row.label)}</td><td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600">${escapeHtml(row.value)}</td></tr>`
        )
        .join('')}</table>`
    : '';

  const ctaHtml = cta?.label && cta?.url
    ? `<div style="margin-top:20px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#002147;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:13px">${escapeHtml(
        cta.label
      )}</a></div>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:92%;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(135deg,#00152d,#002147)">
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
                  <tr>
                    <td style="vertical-align:middle;padding-right:10px">
                      <img src="${escapeHtml(logoSrc || getBrandLogoUrl())}" alt="NextStep Talent Logo" style="height:44px;width:auto;display:block;border:0;outline:none;text-decoration:none" />
                    </td>
                    <td style="vertical-align:middle">
                      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.02em">NextStep Talent</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px">
                <p style="margin:0 0 6px;color:#64748b;font-size:11px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(theme.title)}</p>
                <p style="margin:0 0 6px;color:#5a6472;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Step ${escapeHtml(stepNo)} • ${escapeHtml(stepName)}</p>
                <h1 style="margin:0 0 10px;font-size:24px;line-height:1.3;color:#0b1526">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.6">${escapeHtml(message)}</p>
                <div style="display:inline-block;background:${theme.chipBg};color:${theme.chipText};font-size:12px;font-weight:700;padding:6px 10px;border-radius:999px">Status: ${escapeHtml(status)}</div>
                ${detailsHtml}
                ${ctaHtml}
                <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6">This is an automated update from NextStep Talent for ${escapeHtml(candidateName || 'your account')}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const sendStepUpdateEmail = async ({
  to,
  candidateName,
  stepKey,
  stepName,
  heading,
  message,
  status,
  details = [],
  cta,
  eventType,
}) => {
  if (!to) return;
  const stepInfo = stepInfoFor(stepKey, stepName || 'Process Update');
  const effectiveStepName = stepName || stepInfo.name;
  const effectiveStatus = statusLabelMap[String(status || '').toLowerCase()] || titleCase(String(status || 'Updated'));
  const variant = inferVariant({ eventType, stepKey, status: effectiveStatus });

  const subject = `Step ${stepInfo.no}: ${effectiveStepName} - ${effectiveStatus}`;
  const hasInlineLogo = logoFileExists();
  const logoSrc = hasInlineLogo ? `cid:${BRAND_LOGO_CID}` : getBrandLogoUrl();
  const html = buildHtml({
    candidateName,
    heading,
    message,
    stepNo: stepInfo.no,
    stepName: effectiveStepName,
    status: effectiveStatus,
    details,
    cta,
    variant,
    logoSrc,
  });

  const textLines = [
    `Step ${stepInfo.no}: ${effectiveStepName}`,
    `Status: ${effectiveStatus}`,
    heading,
    message,
    ...details.map((d) => `${d.label}: ${d.value}`),
    ...(cta?.label && cta?.url ? [`${cta.label}: ${cta.url}`] : []),
  ];

  const attachments = hasInlineLogo
    ? [
        {
          filename: 'logo.png',
          path: getBrandLogoPath(),
          cid: BRAND_LOGO_CID,
        },
      ]
    : [];

  try {
    await sendEmail({
      to,
      subject,
      text: textLines.join('\n'),
      html,
      attachments,
    });
  } catch (error) {
    console.error('Step update email failed:', error.message);
  }
};

module.exports = {
  sendStepUpdateEmail,
  stepCatalog,
};
