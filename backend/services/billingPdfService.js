const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const Profile = require('../models/Profile');
const { COMPANY_DETAILS, PAYMENT_STAGES, PAYMENT_STAGE_CONFIG } = require('../constants/workflow');
const { nextInvoiceNumber, nextReceiptNumber, nextPdfReference } = require('./documentNumberService');

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const getBackendUploadsPath = (...parts) => path.join(__dirname, '..', 'uploads', ...parts);
const getWebsiteUrl = () => String(process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://nextsteptalent.net').replace(/\/+$/, '');
const getLogoPath = () => process.env.COMPANY_LOGO_PATH || process.env.BRAND_LOGO_PATH || path.resolve(__dirname, '../../frontend/public/logo.png');
const getLogoUrl = () => process.env.BRAND_LOGO_URL || `${getWebsiteUrl()}/logo.png`;
const getCandidateDisplayId = (candidate) => candidate?.candidateId || String(candidate?._id || '');

const formatDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US');
};

const formatUsd = (value) => `USD $${Number(value || 0).toLocaleString('en-US')}`;

const getReceiptStageTitle = (stage) => {
  if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) return 'INITIAL ONBOARDING & PROFILE EVALUATION FEE';
  if (stage === PAYMENT_STAGES.FIRST_INSTALLMENT) return 'FIRST INSTALLMENT - CAREER DEVELOPMENT & PROCESSING SERVICES';
  return 'FINAL PAYMENT - POST SELECTION PROCESSING';
};

const getInvoiceTitle = (stage) =>
  stage === PAYMENT_STAGES.FIRST_INSTALLMENT
    ? 'INVOICE - CAREER DEVELOPMENT SERVICES (Part I)'
    : 'INVOICE - CAREER DEVELOPMENT SERVICES (Part II)';

const getDefaultAmountForStage = (stage) => {
  const cfg = PAYMENT_STAGE_CONFIG[stage];
  return cfg ? Number(cfg.amount || 0) : 0;
};

const getPaymentReference = (payment, stage) => {
  if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) {
    return payment?.stripeChargeId || payment?.stripePaymentIntentId || payment?.transactionId || 'N/A';
  }
  return payment?.bankTransactionReference || payment?.bankReference || payment?.transactionId || 'N/A';
};

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderLines = (lines = []) => lines.filter((line) => line !== null && line !== undefined).join('\n');

const buildReceiptText = ({ candidate, details, payment, receipt, stage }) => {
  const receiptNumber = receipt?.receiptNumber || receipt?.receiptNo || '';
  const date = receipt?.date || payment?.verifiedAt || payment?.createdAt || new Date();
  const amount = payment?.amount || receipt?.amountReceived || getDefaultAmountForStage(stage);
  const reference = getPaymentReference(payment, stage);

  const common = [
    'PAYMENT RECEIPT',
    getReceiptStageTitle(stage),
    '',
    COMPANY_DETAILS.legalName,
    `DBA: ${COMPANY_DETAILS.dba}`,
    '',
    `Receipt No.: ${receiptNumber}`,
    `Date: ${formatDate(date)}`,
    '',
    'RECEIVED FROM',
    '',
    `Candidate Name: ${details.name}`,
    `Email Address: ${details.email}`,
    `Country: ${details.country}`,
    `Phone Number: ${details.phone}`,
    '',
    'PAYMENT DETAILS',
    '',
    `Amount Received: ${formatUsd(amount)}`,
  ];

  if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) {
    return renderLines([
      ...common,
      '',
      'Purpose of Payment:',
      'Initial onboarding, profile evaluation, administrative review, candidate assessment, and preliminary career development services.',
      '',
      'Payment Method:',
      'Stripe / Online Payment Gateway',
      '',
      'Transaction ID:',
      reference,
      '',
      'IMPORTANT NOTE',
      '',
      'This payment is strictly non-refundable as per the agreed Payment & Refund Policy and Candidate Services Agreement accepted during onboarding.',
      '',
      'Authorized By:',
      COMPANY_DETAILS.legalName,
      `DBA: ${COMPANY_DETAILS.dba}`,
      '',
      'DISCLAIMER',
      '',
      'This receipt is system-generated and valid without signature.',
    ]);
  }

  if (stage === PAYMENT_STAGES.FIRST_INSTALLMENT) {
    return renderLines([
      ...common,
      '',
      'Payment Includes:',
      '- Professional advisory and onboarding services',
      '- Candidate profile optimization',
      '- Employer coordination and operational processing',
      '- Administrative handling',
      '- Banking and transfer charges',
      '',
      'Payment Method:',
      'Bank Transfer / Wire Transfer',
      '',
      'Transaction Reference Number:',
      reference,
      '',
      'REFUND CONDITIONS',
      '',
      'As per the signed Candidate Services Agreement:',
      '',
      '- If the Candidate is not selected after interviews, USD $200 shall be deducted toward administrative and operational charges and USD $2,900 may be refunded.',
      '- If the Candidate is selected and voluntarily declines or fails to join the employer, this payment becomes non-refundable.',
      '- Applicable banking and processing charges remain non-refundable.',
      '',
      'Authorized By:',
      COMPANY_DETAILS.legalName,
      `DBA: ${COMPANY_DETAILS.dba}`,
      '',
      'DISCLAIMER',
      '',
      'This receipt is system-generated and valid without signature.',
    ]);
  }

  return renderLines([
    ...common,
    '',
    'Purpose of Payment:',
    'Final onboarding, employer integration support, administrative coordination, operational processing, and completion of career development and candidate support services.',
    '',
    'Payment Method:',
    'Bank Transfer / Wire Transfer',
    '',
    'Transaction Reference Number:',
    reference,
    '',
    'IMPORTANT NOTE',
    '',
    'This payment is processed following candidate selection/approval by the hiring company and forms part of the agreed professional service structure between the Candidate and NG Global Advisory and Consulting LLC. DBA NextStep Talent.',
    '',
    'Authorized By:',
    COMPANY_DETAILS.legalName,
    `DBA: ${COMPANY_DETAILS.dba}`,
    '',
    'DISCLAIMER',
    '',
    'This receipt is system-generated and valid without signature.',
  ]);
};

const buildInvoiceText = ({ candidate, details, invoice, stage, amountReceived = 0 }) => {
  const isStage1 = stage === PAYMENT_STAGES.FIRST_INSTALLMENT;
  const invoiceNumber = invoice?.invoiceNumber || '';
  const issueDate = invoice?.issueDate || new Date();
  const totalProgramFee = Object.values(PAYMENT_STAGE_CONFIG).reduce((s, c) => s + Number(c.amount || 0), 0);
  const firstAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FIRST_INSTALLMENT].amount || 0);
  const finalAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0);

  return renderLines([
    getInvoiceTitle(stage),
    '',
    COMPANY_DETAILS.legalName,
    `DBA: ${COMPANY_DETAILS.dba}`,
    '',
    'INVOICE DETAILS',
    '',
    `Invoice Number: ${invoiceNumber}`,
    `Issue Date: ${formatDate(issueDate)}`,
    `Candidate ID: ${getCandidateDisplayId(candidate)}`,
    '',
    'BILL TO (CANDIDATE)',
    '',
    `Full Name: ${details.name}`,
    `Email: ${details.email}`,
    `Country: ${details.country}`,
    '',
    'SERVICE DESCRIPTION',
    '',
    'Career Development & Candidate Advisory Services',
    isStage1
      ? '(Including initial evaluation, profile assessment, eligibility review, and onboarding processing)'
      : '(Including employer coordination, interview facilitation, profile enhancement, and onboarding support)',
    '',
    'PAYMENT SUMMARY',
    '',
    `Total Program Fee: ${formatUsd(totalProgramFee)}`,
    '',
    ...(isStage1
      ? [
          `Amount Due (Stage 1 Payment): ${formatUsd(firstAmount)}`,
          '',
          'Payment Status: DUE',
          '',
          `Remaining Balance After Payment: ${formatUsd(finalAmount)}`,
        ]
      : [
          `Amount Received: ${formatUsd(amountReceived || invoice?.amountReceived || finalAmount)}`,
          '',
          `Amount Due (Final Payment): ${formatUsd(finalAmount)}`,
          '',
          'Payment Status: FINAL PAYMENT DUE',
        ]),
    '',
    'NOTES',
    '',
    ...(isStage1
      ? [
          '- This invoice represents the first installment of a structured career development service program.',
          '- Completion of this payment initiates onboarding and document submission access.',
          '- Final outcomes are subject to eligibility, verification, and external employer decisions.',
        ]
      : [
          '- This invoice represents the final installment of the structured service program.',
          '- Final onboarding and employer integration will proceed only after full settlement.',
          '- All services are subject to candidate verification and employer selection outcomes.',
        ]),
    '',
    'PAYMENT TERMS',
    '',
    ...(isStage1
      ? [
          '- Payment is due upon issuance',
          '- Payment confirms acceptance of service terms and onboarding initiation',
          '- Non-payment may result in cancellation of application processing',
        ]
      : [
          '- Payment must be completed prior to final onboarding',
          '- Failure to complete payment may result in suspension or cancellation of services',
          '- Previous payment terms and refund policies remain applicable as per agreement',
        ]),
    '',
    'COMPANY DETAILS',
    '',
    COMPANY_DETAILS.legalName,
    `DBA: ${COMPANY_DETAILS.dba}`,
    '',
    'DISCLAIMER',
    '',
    'This invoice is system-generated and valid without signature.',
  ]);
};

const buildBillingHtml = ({ title, text, note = '' }) => `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#0f172a">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0">
      <tr><td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="max-width:94%;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:18px 24px;border-bottom:1px solid #e2e8f0">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top"><img src="${escapeHtml(getLogoUrl())}" alt="NextStep Talent" style="height:46px;width:auto;display:block;border:0" /></td>
                  <td style="vertical-align:top;text-align:right;font-size:12px;line-height:1.55;color:#475569">
                    Website: ${escapeHtml(getWebsiteUrl())}<br/>
                    Office: ${escapeHtml(COMPANY_DETAILS.officeAddress.replace(/\n/g, ', '))}<br/>
                    Email: ${escapeHtml(COMPANY_DETAILS.contactEmail)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:22px 24px">
            <h1 style="margin:0 0 14px;font-size:20px;color:#0f172a">${escapeHtml(title)}</h1>
            ${note ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#475569">${escapeHtml(note)}</p>` : ''}
            <pre style="white-space:pre-wrap;margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.55;color:#0f172a">${escapeHtml(text)}</pre>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const writeDocument = async ({ filePath, build }) => {
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    build(doc);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const drawHeader = (doc, title) => {
  const pageWidth = doc.page.width;
  const leftX = 40;
  const rightX = pageWidth - 40;
  const contentWidth = rightX - leftX;
  const logoPath = getLogoPath();
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, leftX, 30, { fit: [120, 54] });
    } catch {
      // ignore logo rendering issues
    }
  }

  doc.fontSize(10).fillColor('#334155').text(`Website: ${getWebsiteUrl()}`, leftX, 92, { width: contentWidth });
  doc.text(`Office: ${COMPANY_DETAILS.officeAddress.replace(/\n/g, ', ')}`, leftX, doc.y + 2, { width: contentWidth });
  doc.text(`Email: ${COMPANY_DETAILS.contactEmail}`, leftX, doc.y + 2, { width: contentWidth });

  doc.moveDown(0.6);
  doc.fontSize(15).fillColor('#0f172a').text(title, leftX, doc.y, { width: contentWidth });
  doc.moveDown(0.4);
  doc.fontSize(11).text(COMPANY_DETAILS.legalName, leftX, doc.y, { width: contentWidth });
  doc.text(`DBA: ${COMPANY_DETAILS.dba}`, leftX, doc.y, { width: contentWidth });
  doc.moveDown(0.8);
};

const candidateContext = async (candidate) => {
  const profile = await Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean();
  return {
    name: candidate?.name || 'N/A',
    email: candidate?.email || 'N/A',
    country: profile?.personalDetails?.currentCountryOfResidence || 'N/A',
    phone: candidate?.phone || 'N/A',
    profile,
  };
};

const generateInvoiceForStage = async ({ candidate, stage, amountReceived = 0 }) => {
  const details = await candidateContext(candidate);
  const invoiceDir = getBackendUploadsPath('invoices', 'system');
  ensureDir(invoiceDir);

  const invoiceNumber = await nextInvoiceNumber();
  const pdfReferenceNumber = await nextPdfReference('INV');
  const issueDate = new Date();
  const isStage1 = stage === PAYMENT_STAGES.FIRST_INSTALLMENT;
  const fileName = `${invoiceNumber}.pdf`;
  const filePath = path.join(invoiceDir, fileName);

  await writeDocument({
    filePath,
    build: (doc) => {
      const leftX = 40;
      const contentWidth = doc.page.width - 80;
      drawHeader(doc, getInvoiceTitle(stage));

      doc.fontSize(12).text('INVOICE DETAILS', leftX, doc.y, { width: contentWidth });
      doc.fontSize(11).text(`Invoice Number: ${invoiceNumber}`, leftX, doc.y, { width: contentWidth });
      doc.text(`Issue Date: ${issueDate.toLocaleDateString('en-US')}`, leftX, doc.y, { width: contentWidth });
      doc.text(`Candidate ID: ${getCandidateDisplayId(candidate)}`, leftX, doc.y, { width: contentWidth });
      doc.moveDown();

      doc.fontSize(12).text('BILL TO (CANDIDATE)', leftX, doc.y, { width: contentWidth });
      doc.fontSize(11).text(`Full Name: ${details.name}`, leftX, doc.y, { width: contentWidth });
      doc.text(`Email: ${details.email}`, leftX, doc.y, { width: contentWidth });
      doc.text(`Country: ${details.country}`, leftX, doc.y, { width: contentWidth });
      doc.moveDown();

      doc.fontSize(12).text('SERVICE DESCRIPTION', leftX, doc.y, { width: contentWidth });
      doc.fontSize(11).text('Career Development & Candidate Advisory Services', leftX, doc.y, { width: contentWidth });
      doc.text(
        isStage1
          ? '(Including initial evaluation, profile assessment, eligibility review, and onboarding processing)'
          : '(Including employer coordination, interview facilitation, profile enhancement, and onboarding support)',
        leftX,
        doc.y,
        { width: contentWidth }
      );
      doc.moveDown();

      doc.fontSize(12).text('PAYMENT SUMMARY');
      doc.fontSize(11).text(`Total Program Fee: ${formatUsd(Object.values(PAYMENT_STAGE_CONFIG).reduce((s, c) => s + Number(c.amount || 0), 0))}`);
      if (isStage1) {
        doc.text(`Amount Due (Stage 1 Payment): ${formatUsd(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FIRST_INSTALLMENT].amount)}`);
        doc.text('Payment Status: DUE');
        doc.text(`Remaining Balance After Payment: ${formatUsd(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount)}`);
      } else {
        doc.text(`Amount Received: ${formatUsd(Number(amountReceived || PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0))}`);
        doc.text(`Amount Due (Final Payment): ${formatUsd(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount)}`);
        doc.text('Payment Status: FINAL PAYMENT DUE');
      }
      doc.moveDown();

      doc.fontSize(12).text('NOTES');
      doc.fontSize(11).text(
        isStage1
          ? '- This invoice represents the first installment of a structured career development service program.\n- Completion of this payment initiates onboarding and document submission access.\n- Final outcomes are subject to eligibility, verification, and external employer decisions.'
          : '- This invoice represents the final installment of the structured service program.\n- Final onboarding and employer integration will proceed only after full settlement.\n- All services are subject to candidate verification and employer selection outcomes.',
        { width: 510 }
      );
      doc.moveDown();

      doc.fontSize(12).text('PAYMENT TERMS');
      doc.fontSize(11).text(
        isStage1
          ? '- Payment is due upon issuance\n- Payment confirms acceptance of service terms and onboarding initiation\n- Non-payment may result in cancellation of application processing'
          : '- Payment must be completed prior to final onboarding\n- Failure to complete payment may result in suspension or cancellation of services\n- Previous payment terms and refund policies remain applicable as per agreement',
        { width: 510 }
      );
      doc.moveDown();

      doc.fontSize(12).text('COMPANY DETAILS');
      doc.fontSize(11).text(COMPANY_DETAILS.legalName);
      doc.text(`DBA: ${COMPANY_DETAILS.dba}`);
      doc.moveDown();
      doc.fontSize(12).text('DISCLAIMER');
      doc.fontSize(11).text('This invoice is system-generated and valid without signature.');
    },
  });

  const invoice = await Invoice.create({
    invoiceNumber,
    candidateId: candidate._id,
    paymentStage: stage,
    issueDate,
    candidateName: details.name,
    candidateEmail: details.email,
    candidateCountry: details.country,
    totalProgramFee: Object.values(PAYMENT_STAGE_CONFIG).reduce((s, c) => s + Number(c.amount || 0), 0),
    amountReceived: isStage1 ? 0 : Number(amountReceived || PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0),
    amountDue: PAYMENT_STAGE_CONFIG[stage] ? Number(PAYMENT_STAGE_CONFIG[stage].amount || 0) : 0,
    paymentStatus: isStage1 ? 'DUE' : 'FINAL PAYMENT DUE',
    pdfUrl: `/uploads/invoices/system/${fileName}`,
    pdfPath: filePath,
    pdfReferenceNumber,
  });

  return invoice;
};

const generateReceiptForPayment = async ({ candidate, payment, stage }) => {
  const details = await candidateContext(candidate);
  const receiptDir = getBackendUploadsPath('payment-receipts', 'system');
  ensureDir(receiptDir);

  const receiptNumber = await nextReceiptNumber();
  const pdfReferenceNumber = await nextPdfReference('RCPT');
  const date = payment?.verifiedAt || payment?.createdAt || new Date();
  const fileName = `${receiptNumber}.pdf`;
  const filePath = path.join(receiptDir, fileName);

  const stageTitle = getReceiptStageTitle(stage);

  await writeDocument({
    filePath,
    build: (doc) => {
      const leftX = 40;
      const contentWidth = doc.page.width - 80;
      drawHeader(doc, `PAYMENT RECEIPT\n${stageTitle}`);

      doc.fontSize(11).text(`Receipt No.: ${receiptNumber}`, leftX, doc.y, { width: contentWidth });
      doc.text(`Date: ${new Date(date).toLocaleDateString('en-US')}`, leftX, doc.y, { width: contentWidth });
      doc.moveDown();

      doc.fontSize(12).text('RECEIVED FROM', leftX, doc.y, { width: contentWidth });
      doc.fontSize(11).text(`Candidate Name: ${details.name}`, leftX, doc.y, { width: contentWidth });
      doc.text(`Email Address: ${details.email}`, leftX, doc.y, { width: contentWidth });
      doc.text(`Country: ${details.country}`, leftX, doc.y, { width: contentWidth });
      doc.text(`Phone Number: ${details.phone}`, leftX, doc.y, { width: contentWidth });
      doc.moveDown();

      doc.fontSize(12).text('PAYMENT DETAILS', leftX, doc.y, { width: contentWidth });
      doc.fontSize(11).text(`Amount Received: USD $${Number(payment?.amount || 0).toLocaleString('en-US')}`, leftX, doc.y, { width: contentWidth });
      if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) {
        doc.text('Purpose of Payment:');
        doc.text('Initial onboarding, profile evaluation, administrative review, candidate assessment, and preliminary career development services.');
        doc.text('Payment Method:');
        doc.text('Stripe / Online Payment Gateway');
        doc.text('Transaction ID:');
        doc.text(`${getPaymentReference(payment, stage)}`);
        doc.moveDown(0.3);
        doc.fontSize(12).text('IMPORTANT NOTE');
        doc.fontSize(11).text(
          'This payment is strictly non-refundable as per the agreed Payment & Refund Policy and Candidate Services Agreement accepted during onboarding.',
          { width: 510 }
        );
      } else if (stage === PAYMENT_STAGES.FIRST_INSTALLMENT) {
        doc.text('Payment Includes:');
        doc.text('- Professional advisory and onboarding services');
        doc.text('- Candidate profile optimization');
        doc.text('- Employer coordination and operational processing');
        doc.text('- Administrative handling');
        doc.text('- Banking and transfer charges');
        doc.text('Payment Method:');
        doc.text('Bank Transfer / Wire Transfer');
        doc.text('Transaction Reference Number:');
        doc.text(`${getPaymentReference(payment, stage)}`);
        doc.moveDown(0.3);
        doc.fontSize(12).text('REFUND CONDITIONS');
        doc.fontSize(11).text('As per the signed Candidate Services Agreement:');
        doc.text('- If the Candidate is not selected after interviews, USD $200 shall be deducted toward administrative and operational charges and USD $2,900 may be refunded.', { width: 510 });
        doc.text('- If the Candidate is selected and voluntarily declines or fails to join the employer, this payment becomes non-refundable.', { width: 510 });
        doc.text('- Applicable banking and processing charges remain non-refundable.', { width: 510 });
      } else {
        doc.text('Purpose of Payment:');
        doc.text('Final onboarding, employer integration support, administrative coordination, operational processing, and completion of career development and candidate support services.', { width: 510 });
        doc.text('Payment Method:');
        doc.text('Bank Transfer / Wire Transfer');
        doc.text('Transaction Reference Number:');
        doc.text(`${getPaymentReference(payment, stage)}`);
        doc.moveDown(0.3);
        doc.fontSize(12).text('IMPORTANT NOTE');
        doc.fontSize(11).text(
          'This payment is processed following candidate selection/approval by the hiring company and forms part of the agreed professional service structure between the Candidate and NG Global Advisory and Consulting LLC. DBA NextStep Talent.',
          { width: 510 }
        );
      }
      doc.moveDown();

      doc.text('Authorized By:');
      doc.text(COMPANY_DETAILS.legalName);
      doc.text(`DBA: ${COMPANY_DETAILS.dba}`);
      doc.moveDown();
      doc.fontSize(12).text('DISCLAIMER');
      doc.fontSize(11).text('This receipt is system-generated and valid without signature.');
    },
  });

  const receipt = await Receipt.create({
    receiptNumber,
    candidateId: candidate._id,
    paymentStage: stage,
    paymentId: payment._id,
    date,
    candidateName: details.name,
    candidateEmail: details.email,
    country: details.country,
    phoneNumber: details.phone,
    amountReceived: Number(payment?.amount || 0),
    paymentMethod: payment?.method || '',
    transactionReferenceNumber: getPaymentReference(payment, stage),
    pdfUrl: `/uploads/payment-receipts/system/${fileName}`,
    pdfPath: filePath,
    pdfReferenceNumber,
  });

  return receipt;
};

const buildReceiptEmailForPayment = async ({ candidate, payment, receipt, stage, invoice = null }) => {
  const details = await candidateContext(candidate);
  const receiptText = buildReceiptText({ candidate, details, payment, receipt, stage });
  const invoiceLine = invoice
    ? `\n\nAttached Invoice:\nInvoice Number: ${invoice.invoiceNumber}\nInvoice Link: ${getWebsiteUrl()}${invoice.pdfUrl}`
    : '';
  const text = `${receiptText}${invoiceLine}`;
  const subject =
    stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE
      ? 'Payment Receipt - Initial Onboarding & Profile Evaluation Fee'
      : stage === PAYMENT_STAGES.FIRST_INSTALLMENT
        ? 'Payment Receipt - First Installment'
        : 'Payment Receipt - Final Payment';

  return {
    subject,
    text,
    html: buildBillingHtml({
      title: subject,
      text,
      note: invoice
        ? 'Your payment receipt and invoice PDFs are attached to this email and are also available in your candidate portal.'
        : 'Your payment receipt PDF is attached to this email and is also available in your candidate portal.',
    }),
  };
};

const buildInvoiceEmailForStage = async ({ candidate, invoice, stage, amountReceived = 0 }) => {
  const details = await candidateContext(candidate);
  const text = buildInvoiceText({ candidate, details, invoice, stage, amountReceived });
  const subject =
    stage === PAYMENT_STAGES.FIRST_INSTALLMENT
      ? 'Invoice - Career Development Services Part I'
      : 'Invoice - Career Development Services Part II';

  return {
    subject,
    text,
    html: buildBillingHtml({
      title: subject,
      text,
      note: 'Your invoice PDF is attached to this email and is also available in your candidate portal.',
    }),
  };
};

module.exports = {
  generateInvoiceForStage,
  generateReceiptForPayment,
  buildReceiptEmailForPayment,
  buildInvoiceEmailForStage,
};
