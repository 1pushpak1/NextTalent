const nodemailer = require('nodemailer');

const isPlaceholderCredential = (value = '') => {
  const v = String(value).toLowerCase().trim();
  return !v || v.includes('placeholder') || v.includes('example.com') || v === 'changeme';
};

const getSmtpConfig = () => {
  const SMTP_HOST = process.env.SMTP_HOST || '';
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_USERNAME = process.env.SMTP_USERNAME || '';
  const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
  const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USERNAME;
  const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'NextStep Talent';
  const SMTP_USE_SSL = String(process.env.SMTP_USE_SSL || '').toLowerCase() === 'true';
  const SMTP_USE_STARTTLS = String(process.env.SMTP_USE_STARTTLS || '').toLowerCase() === 'true';
  const SMTP_TIMEOUT_SECONDS = Number(process.env.SMTP_TIMEOUT_SECONDS || 30);

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

const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_USE_SSL,
    SMTP_USE_STARTTLS,
    SMTP_TIMEOUT_SECONDS,
  } = getSmtpConfig();

  const shouldUseSimulatedEmail =
    isPlaceholderCredential(SMTP_HOST) ||
    isPlaceholderCredential(SMTP_USERNAME) ||
    isPlaceholderCredential(SMTP_PASSWORD) ||
    isPlaceholderCredential(SMTP_FROM_EMAIL);

  if (shouldUseSimulatedEmail) {
    throw new Error(
      'SMTP is not configured correctly. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, and SMTP_FROM_NAME.'
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_USE_SSL,
      requireTLS: SMTP_USE_STARTTLS,
      connectionTimeout: SMTP_TIMEOUT_SECONDS * 1000,
      auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
      attachments,
    });
    return info;
  } catch (error) {
    console.error('[Email Send Failed]', {
      to,
      subject,
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_USE_SSL,
      requireTLS: SMTP_USE_STARTTLS,
      error: error.message,
    });
    throw new Error(`Unable to send email: ${error.message}`);
  }
};

module.exports = sendEmail;
