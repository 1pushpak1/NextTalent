#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sendTransactionalEmailSafe } = require('../services/emailService');
const { wrapHtml } = require('../services/emailTemplateService');

async function run() {
  const to = process.argv[2] || 'kumawatharsh2004@gmail.com';
  const candidateName = process.argv[3] || 'Candidate';

  const subject = 'NextStep Talent – Account Creation Invitation (Test)';
  const text = `Dear ${candidateName},\n\nYour application has been approved by both review stages.\n\nNext steps:\n1. Create your account using the same email address used for your application.\n2. Verify your email address after account creation.\n3. Verify your mobile number after email verification.\n4. Continue to your candidate dashboard for the next steps.\n\nEmail: ${to}\n\nThis invitation link is not included in this test email.\n\nRegards,\nNextStep Talent Team\n\nThis is an official communication from NextStep Talent.`;

  const html = wrapHtml({
    title: subject,
    bodyHtml: `<p>Dear ${candidateName},</p><p>Your application has been approved by both review stages.</p><p><b>Next steps:</b><br/>1. Create your account using the same email address used for your application.<br/>2. Verify your email address after account creation.<br/>3. Verify your mobile number after email verification.<br/>4. Continue to your candidate dashboard for the next steps.</p><p><b>Email:</b> ${to}</p><p><i>This invitation link is not included in this test email.</i></p><p>Regards,<br/>NextStep Talent Team</p>`,
  });

  try {
    const result = await sendTransactionalEmailSafe({
      to,
      subject,
      text,
      html,
      fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@nextsteptalent.net',
      fromName: process.env.SMTP_FROM_NAME || 'NextStep Talent Team',
      templateKey: 'profile_account_invite_test',
    });

    if (!result.ok) {
      console.error('Send failed:', result.error?.message || result.error);
      process.exit(2);
    }

    console.log('Email send result:', result.info);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
}

run();
