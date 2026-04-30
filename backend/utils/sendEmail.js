const nodemailer = require('nodemailer');

const isPlaceholderCredential = (value = '') => {
  const v = String(value).toLowerCase().trim();
  return !v || v.includes('placeholder') || v.includes('example.com') || v === 'changeme';
};

const shouldUseSimulatedEmail = () =>
  isPlaceholderCredential(process.env.EMAIL_USER) || isPlaceholderCredential(process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'placeholder@example.com',
    pass: process.env.EMAIL_PASS || 'placeholder',
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (shouldUseSimulatedEmail()) {
      console.log('[Email Placeholder]', { to, subject, text });
      return { simulated: true };
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (error) {
    console.log('[Email Placeholder Fallback]', { to, subject, text, error: error.message });
    return { simulated: true, error: error.message };
  }
};

module.exports = sendEmail;
