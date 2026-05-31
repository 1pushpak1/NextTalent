const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');
const { COMPANY_DETAILS } = require('../constants/workflow');

let cachedTransporter = null;
let cachedTransporterKey = '';

const normalizeAddressList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry || '').trim()).filter(Boolean))];
  }
  return [String(value).trim()].filter(Boolean);
};

const getSmtpConfig = () => {
  const SMTP_HOST = String(process.env.SMTP_HOST || '').trim();
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_USERNAME = String(process.env.SMTP_USERNAME || '').trim();
  const SMTP_PASSWORD = String(process.env.SMTP_PASSWORD || '');
  const SMTP_FROM_EMAIL = String(process.env.SMTP_FROM_EMAIL || COMPANY_DETAILS.senderEmail).trim();
  const SMTP_FROM_NAME = String(process.env.SMTP_FROM_NAME || COMPANY_DETAILS.senderName).trim();
  const SMTP_USE_SSL = String(process.env.SMTP_USE_SSL || 'false').toLowerCase() === 'true';
  const SMTP_USE_STARTTLS = String(process.env.SMTP_USE_STARTTLS || 'true').toLowerCase() === 'true';
  const SMTP_TIMEOUT_SECONDS = Number(process.env.SMTP_TIMEOUT_SECONDS || 15);

  return {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_USE_SSL,
    SMTP_USE_STARTTLS,
    SMTP_TIMEOUT_SECONDS,
  };
};

const getTransporter = () => {
  const cfg = getSmtpConfig();
  if (!cfg.SMTP_HOST || !cfg.SMTP_USERNAME || !cfg.SMTP_PASSWORD || !cfg.SMTP_FROM_EMAIL) {
    throw new Error('SMTP is not configured correctly. Set SMTP_* environment values.');
  }

  const nextKey = `${cfg.SMTP_HOST}|${cfg.SMTP_PORT}|${cfg.SMTP_USERNAME}|${cfg.SMTP_USE_SSL}|${cfg.SMTP_USE_STARTTLS}`;
  if (cachedTransporter && cachedTransporterKey === nextKey) {
    return { transporter: cachedTransporter, cfg };
  }

  cachedTransporter = nodemailer.createTransport({
    host: cfg.SMTP_HOST,
    port: cfg.SMTP_PORT,
    secure: cfg.SMTP_USE_SSL,
    requireTLS: cfg.SMTP_USE_STARTTLS,
    connectionTimeout: cfg.SMTP_TIMEOUT_SECONDS * 1000,
    auth: {
      user: cfg.SMTP_USERNAME,
      pass: cfg.SMTP_PASSWORD,
    },
  });
  cachedTransporterKey = nextKey;

  return { transporter: cachedTransporter, cfg };
};

const sendTransactionalEmail = async ({
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  fromEmail,
  fromName,
  attachments = [],
  templateKey = 'generic',
  relatedCandidateId = null,
  relatedAdminActionId = '',
}) => {
  // No allowlist restriction — all template keys are permitted for internal transactional use.

  const toList = normalizeAddressList(to);
  const ccList = normalizeAddressList(cc);
  const bccList = normalizeAddressList(bcc);

  if (!toList.length) {
    throw new Error('Email recipient is required');
  }

  const { transporter, cfg } = getTransporter();
  // Prefer explicit fromEmail > configured SMTP_FROM_EMAIL > SMTP_USERNAME (if it looks like an email) > fallback sender
  const smtpUsernameIsEmail = String(cfg.SMTP_USERNAME || '').includes('@');
  const effectiveFromEmail = String(
    fromEmail || cfg.SMTP_FROM_EMAIL || (smtpUsernameIsEmail ? cfg.SMTP_USERNAME : COMPANY_DETAILS.senderEmail)
  ).trim();
  const effectiveFromName = String(fromName || cfg.SMTP_FROM_NAME || COMPANY_DETAILS.senderName).trim();

  try {
    // Ensure the SMTP envelope from uses the authenticated username when available to satisfy providers
    const envelopeFrom = smtpUsernameIsEmail ? cfg.SMTP_USERNAME : effectiveFromEmail;
    const info = await transporter.sendMail({
      from: `"${effectiveFromName}" <${effectiveFromEmail}>`,
      to: toList,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject,
      text,
      html,
      attachments,
      envelope: {
        from: envelopeFrom,
        to: toList,
      },
    });

    let log = null;
    try {
      log = await EmailLog.create({
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: String(subject || ''),
        templateKey,
        relatedCandidateId,
        relatedAdminActionId: String(relatedAdminActionId || ''),
        status: 'sent',
        sentAt: new Date(),
        errorMessage: '',
      });
    } catch (logErr) {
      const shouldLog = String(process.env.EMAIL_LOG_ERRORS || 'false').toLowerCase() === 'true';
      if (shouldLog) {
        console.error('[EmailLog Create Failed]', { error: logErr?.message || logErr });
      }
      // Don't fail the send if logging the email fails (e.g., Mongo down). Return send info without a log.
      log = null;
    }

    return { info, log };
  } catch (error) {
    let log = null;
    try {
      log = await EmailLog.create({
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: String(subject || ''),
        templateKey,
        relatedCandidateId,
        relatedAdminActionId: String(relatedAdminActionId || ''),
        status: 'failed',
        sentAt: null,
        errorMessage: String(error?.message || 'Unknown email error'),
      });
    } catch (logErr) {
      const shouldLog = String(process.env.EMAIL_LOG_ERRORS || 'false').toLowerCase() === 'true';
      if (shouldLog) {
        console.error('[EmailLog Create Failed After Send Error]', { error: logErr?.message || logErr });
      }
      log = null;
    }

    const shouldLog = String(process.env.EMAIL_LOG_ERRORS || 'false').toLowerCase() === 'true';
    if (shouldLog) {
      console.error('[Email Send Failed]', {
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject,
        templateKey,
        code: error?.code,
        responseCode: error?.responseCode,
        response: error?.response,
        error: error?.message,
      });
    }

    const wrapped = new Error(`Unable to send email: ${error.message}`);
    wrapped.originalError = error;
    wrapped.emailLogId = log?._id || null;
    throw wrapped;
  }
};

const sendTransactionalEmailSafe = async (payload) => {
  try {
    const result = await sendTransactionalEmail(payload);
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error };
  }
};

module.exports = {
  getSmtpConfig,
  sendTransactionalEmail,
  sendTransactionalEmailSafe,
};
