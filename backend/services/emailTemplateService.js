const { COMPANY_DETAILS } = require('../constants/workflow');

const websiteUrl = () => String(process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://nextsteptalent.net').replace(/\/+$/, '');

const footerText = `${COMPANY_DETAILS.legalName}\nDBA: ${COMPANY_DETAILS.dba}\n${COMPANY_DETAILS.officeAddress}\n${websiteUrl()}\n${COMPANY_DETAILS.contactEmail}\n\nThis is an automated message from NextStep Talent.`;

const wrapHtml = ({ title, bodyHtml }) => `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#0f172a">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0">
      <tr><td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:92%;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <tr><td style="padding:18px 24px;background:#002147;color:#fff;font-size:20px;font-weight:700">NextStep Talent</td></tr>
          <tr><td style="padding:22px 24px">
            <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a">${title}</h1>
            ${bodyHtml}
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
            <p style="margin:0;font-size:12px;line-height:1.6;color:#475569;white-space:pre-line">${footerText}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const toMultiline = (lines = []) => lines.filter(Boolean).join('\n');

const candidateSubmissionConfirmation = ({ candidateName }) => {
  const subject = 'NextStep Talent Application Submission Received';
  const lines = [
    `Dear ${candidateName || 'Candidate'},`,
    '',
    'Your application was received successfully and is currently under internal eligibility and evaluation review.',
    'Please note that submission does not guarantee selection or employment.',
    `For support, contact ${COMPANY_DETAILS.contactEmail}.`,
  ];
  const html = wrapHtml({
    title: subject,
    bodyHtml: `<p>Dear ${candidateName || 'Candidate'},</p><p>Your application was received successfully and is currently under internal eligibility and evaluation review.</p><p>Please note that submission does not guarantee selection or employment.</p><p>For support, contact ${COMPANY_DETAILS.contactEmail}.</p>`,
  });
  return { subject, text: toMultiline(lines), html };
};

const applicationStatusUpdate = ({ candidateName, selected = false, withPayment = false, invoiceUrl = '' }) => {
  if (selected && withPayment) {
    const subject = 'NextStep Talent Selection Update and Payment Instructions';
    const lines = [
      `Dear ${candidateName || 'Candidate'},`,
      '',
      'You are selected to proceed to the next stage.',
      'Payment Due: USD $3,100',
      'Payment Method: Bank Transfer / Wire Transfer',
      invoiceUrl ? `Invoice: ${invoiceUrl}` : '',
      'Final outcomes remain subject to verification, employer decisions, and payment completion.',
      `For support, contact ${COMPANY_DETAILS.contactEmail}.`,
    ];
    const html = wrapHtml({
      title: subject,
      bodyHtml: `<p>Dear ${candidateName || 'Candidate'},</p><p>You are selected to proceed to the next stage.</p><p><b>Payment Due:</b> USD $3,100<br/><b>Payment Method:</b> Bank Transfer / Wire Transfer${invoiceUrl ? `<br/><b>Invoice:</b> <a href="${invoiceUrl}">${invoiceUrl}</a>` : ''}</p><p>Final outcomes remain subject to verification, employer decisions, and payment completion.</p><p>For support, contact ${COMPANY_DETAILS.contactEmail}.</p>`,
    });
    return { subject, text: toMultiline(lines), html };
  }

  const subject = selected ? 'NextStep Talent Selection Update' : 'NextStep Talent Application Status Update';
  const lines = [
    `Dear ${candidateName || 'Candidate'},`,
    '',
    selected
      ? 'Your profile has moved to the next process stage. Further updates will follow by email and in your portal.'
      : 'Your application was reviewed and is not moving forward at this stage.',
    'Please note that this process does not guarantee selection or employment.',
    `For support, contact ${COMPANY_DETAILS.contactEmail}.`,
  ];
  const html = wrapHtml({
    title: subject,
    bodyHtml: `<p>Dear ${candidateName || 'Candidate'},</p><p>${selected ? 'Your profile has moved to the next process stage. Further updates will follow by email and in your portal.' : 'Your application was reviewed and is not moving forward at this stage.'}</p><p>Please note that this process does not guarantee selection or employment.</p><p>For support, contact ${COMPANY_DETAILS.contactEmail}.</p>`,
  });
  return { subject, text: toMultiline(lines), html };
};

module.exports = {
  websiteUrl,
  footerText,
  candidateSubmissionConfirmation,
  applicationStatusUpdate,
  wrapHtml,
};
