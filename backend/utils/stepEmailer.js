const fs = require('fs');
const path = require('path');
const sendEmail = require('./sendEmail');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Eligibility = require('../models/Eligibility');
const Document = require('../models/Document');
const Interview = require('../models/Interview');
const Payment = require('../models/Payment');
const Testimonial = require('../models/Testimonial');
const { deriveCandidateProgress } = require('./candidateProgress');

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

const suppressedStepStatusEmails = new Set([
  'account:pending',
  'profile:submitted',
  'declaration:completed',
  'onboarding:completed',
  'documents:uploaded',
  'program_payment:pending',
  'hiring:accepted',
  'interviews:accepted',
  'final_payment:completed',
  'testimonial:completed',
]);

const variantThemes = {
  general: {
    chipBg: '#eef2ff',
    chipText: '#1e3a8a',
    cardBg: '#f8fafc',
    cardBorder: '#e2e8f0',
    title: '',
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

const normalizeStepKey = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll('-', '_');

const normalizeStatus = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '_');

const stripLeadingStepLabel = (value = '') =>
  String(value || '')
    .replace(/^\s*step\s*\d+\s*[:.\-–—•]\s*/i, '')
    .replace(/^\s*step\s*\d+\s+/i, '')
    .trim();

const shouldSuppressEmail = ({ stepKey, status }) => {
  const normalizedStepKey = normalizeStepKey(stepKey);
  const normalizedStatus = normalizeStatus(status);
  return suppressedStepStatusEmails.has(`${normalizedStepKey}:${normalizedStatus}`);
};

const resolveNextCandidateAction = async ({ candidateId, to }) => {
  try {
    const candidate = candidateId
      ? await User.findOne({ _id: candidateId, role: 'candidate' }).lean()
      : await User.findOne({ email: String(to || '').toLowerCase().trim(), role: 'candidate' }).lean();
    if (!candidate?._id) return null;

    const [profile, eligibility, documents, interviews, payments, testimonial] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const progress = deriveCandidateProgress({
      candidate,
      profile,
      eligibility,
      documents,
      interviews,
      payments,
      testimonial,
    });

    if (progress?.pendingFrom !== 'candidate') return null;
    if (!progress?.nextAction || progress.nextAction === 'No pending action') return null;

    return {
      currentStage: progress.currentStage || '',
      nextAction: progress.nextAction,
    };
  } catch {
    return null;
  }
};

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

const buildHtml = ({ candidateName, heading, message, stepName, status, details = [], cta, variant = 'general', logoSrc }) => {
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
                <p style="margin:0 0 6px;color:#5a6472;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(stepName)}</p>
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

const buildCongratulationsHtml = ({ candidateName, heading, message, stepName, status, details = [], cta, logoSrc }) => {
  const detailsHtml = details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px">${details
        .map(
          (row) =>
            `<tr><td style="padding:8px 0;color:#166534;font-size:13px;width:40%">${escapeHtml(row.label)}</td><td style="padding:8px 0;color:#052e16;font-size:13px;font-weight:700">${escapeHtml(row.value)}</td></tr>`
        )
        .join('')}</table>`
    : '';

  const ctaHtml = cta?.label && cta?.url
    ? `<div style="margin-top:20px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:13px">${escapeHtml(
        cta.label
      )}</a></div>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#ecfdf3;font-family:Arial,sans-serif;color:#052e16">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:92%;background:#ffffff;border:1px solid #bbf7d0;border-radius:14px;overflow:hidden">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(135deg,#14532d,#166534)">
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
                <p style="margin:0 0 6px;color:#166534;font-size:11px;letter-spacing:.08em;text-transform:uppercase">Congratulations</p>
                <p style="margin:0 0 6px;color:#15803d;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(stepName)}</p>
                <h1 style="margin:0 0 10px;font-size:24px;line-height:1.3;color:#052e16">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 14px;color:#14532d;font-size:14px;line-height:1.7">${escapeHtml(message)}</p>
                <div style="display:inline-block;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:6px 10px;border-radius:999px">Status: ${escapeHtml(status)}</div>
                ${detailsHtml}
                ${ctaHtml}
                <p style="margin:24px 0 0;color:#166534;font-size:12px;line-height:1.6">Great work, ${escapeHtml(candidateName || 'Candidate')}. Keep following your dashboard for the next steps.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const buildRejectionHtml = ({ candidateName, heading, message, stepName, status, details = [], cta, logoSrc }) => {
  const detailsHtml = details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:10px">${details
        .map(
          (row) =>
            `<tr><td style="padding:8px 0;color:#9f1239;font-size:13px;width:40%">${escapeHtml(row.label)}</td><td style="padding:8px 0;color:#4c0519;font-size:13px;font-weight:700">${escapeHtml(row.value)}</td></tr>`
        )
        .join('')}</table>`
    : '';

  const ctaHtml = cta?.label && cta?.url
    ? `<div style="margin-top:20px"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#be123c;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:13px">${escapeHtml(
        cta.label
      )}</a></div>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#fff1f2;font-family:Arial,sans-serif;color:#4c0519">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:92%;background:#ffffff;border:1px solid #fecdd3;border-radius:14px;overflow:hidden">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(135deg,#9f1239,#be123c)">
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
                <p style="margin:0 0 6px;color:#be123c;font-size:11px;letter-spacing:.08em;text-transform:uppercase">Decision Update</p>
                <p style="margin:0 0 6px;color:#9f1239;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(stepName)}</p>
                <h1 style="margin:0 0 10px;font-size:24px;line-height:1.3;color:#4c0519">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 14px;color:#7f1d1d;font-size:14px;line-height:1.7">${escapeHtml(message)}</p>
                <div style="display:inline-block;background:#ffe4e6;color:#9f1239;font-size:12px;font-weight:700;padding:6px 10px;border-radius:999px">Status: ${escapeHtml(status)}</div>
                ${detailsHtml}
                ${ctaHtml}
                <p style="margin:24px 0 0;color:#9f1239;font-size:12px;line-height:1.6">This is an automated update for ${escapeHtml(candidateName || 'your account')}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const inferEmailTone = ({ stepKey, status, heading, message }) => {
  const normalizedStatus = normalizeStatus(status);
  const normalizedStep = normalizeStepKey(stepKey);
  const text = `${String(heading || '')} ${String(message || '')}`.toLowerCase();

  if (['rejected', 'failed', 'not_selected', 'not received'].includes(normalizedStatus)) return 'rejection';
  if (text.includes('not selected') || text.includes('rejected')) return 'rejection';

  if (normalizedStep === 'selection' && ['accepted', 'approved', 'selected'].includes(normalizedStatus)) return 'congratulations';
  if (text.includes('congratulations')) return 'congratulations';

  return 'process_update';
};

const sendStepUpdateEmail = async ({
  to,
  candidateId,
  candidateName,
  stepKey,
  stepName,
  heading,
  message,
  status,
  details = [],
  cta,
  eventType,
  subjectOverride,
}) => {
  if (!to) return;
  if (shouldSuppressEmail({ stepKey, status })) return;

  const candidateNextAction = await resolveNextCandidateAction({ candidateId, to });
  const stepInfo = stepInfoFor(stepKey, stepName || 'Process Update');
  const effectiveStepName = stripLeadingStepLabel(stepName || stepInfo.name) || 'Process Update';
  const effectiveStatus = statusLabelMap[String(status || '').toLowerCase()] || titleCase(String(status || 'Updated'));
  const variant = inferVariant({ eventType, stepKey, status: effectiveStatus });
  const emailTone = inferEmailTone({ stepKey, status, heading, message });
  const enrichedDetails = [
    ...details,
    ...(candidateNextAction
      ? [{ label: 'Next Pending Candidate Step', value: `${candidateNextAction.nextAction}${candidateNextAction.currentStage ? ` (${candidateNextAction.currentStage})` : ''}` }]
      : []),
  ];

  const defaultSubject =
    emailTone === 'congratulations'
      ? `Congratulations! ${effectiveStepName} Approved`
      : emailTone === 'rejection'
        ? `${effectiveStepName} - Decision Update`
        : `${effectiveStepName} - ${effectiveStatus}`;
  const subject = stripLeadingStepLabel(String(subjectOverride || '').trim() || defaultSubject);
  const hasInlineLogo = logoFileExists();
  const logoSrc = hasInlineLogo ? `cid:${BRAND_LOGO_CID}` : getBrandLogoUrl();
  const html =
    emailTone === 'congratulations'
      ? buildCongratulationsHtml({
          candidateName,
          heading,
          message,
          stepName: effectiveStepName,
          status: effectiveStatus,
          details: enrichedDetails,
          cta,
          logoSrc,
        })
      : emailTone === 'rejection'
        ? buildRejectionHtml({
            candidateName,
            heading,
            message,
            stepName: effectiveStepName,
            status: effectiveStatus,
            details: enrichedDetails,
            cta,
            logoSrc,
          })
        : buildHtml({
            candidateName,
            heading,
            message,
            stepName: effectiveStepName,
            status: effectiveStatus,
            details: enrichedDetails,
            cta,
            variant,
            logoSrc,
          });

  const textLines = [
    effectiveStepName,
    `Status: ${effectiveStatus}`,
    `Candidate: ${candidateName || 'Candidate'}`,
    heading,
    message,
    ...enrichedDetails.map((d) => `${d.label}: ${d.value}`),
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
