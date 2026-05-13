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
  const toList = normalizeAddressList(to);
  const ccList = normalizeAddressList(cc);
  const bccList = normalizeAddressList(bcc);

  if (!toList.length) {
    throw new Error('Email recipient is required');
  }

  const { transporter, cfg } = getTransporter();
  const effectiveFromEmail = String(fromEmail || cfg.SMTP_FROM_EMAIL || COMPANY_DETAILS.senderEmail).trim();
  const effectiveFromName = String(fromName || cfg.SMTP_FROM_NAME || COMPANY_DETAILS.senderName).trim();

  try {
    const info = await transporter.sendMail({
      from: `"${effectiveFromName}" <${effectiveFromEmail}>`,
      to: toList,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject,
      text,
      html,
      attachments,
    });

    const log = await EmailLog.create({
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

    return { info, log };
  } catch (error) {
    const log = await EmailLog.create({
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
