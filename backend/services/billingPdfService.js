const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const Profile = require('../models/Profile');
const { COMPANY_DETAILS, PAYMENT_STAGES } = require('../constants/workflow');
const { nextInvoiceNumber, nextReceiptNumber, nextPdfReference } = require('./documentNumberService');

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const getBackendUploadsPath = (...parts) => path.join(__dirname, '..', 'uploads', ...parts);
const getWebsiteUrl = () => String(process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://nextsteptalent.net').replace(/\/+$/, '');
const getLogoPath = () => process.env.COMPANY_LOGO_PATH || process.env.BRAND_LOGO_PATH || path.resolve(__dirname, '../../frontend/public/logo.png');

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
  const logoPath = getLogoPath();
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 40, 30, { fit: [120, 54] });
    } catch {
      // ignore logo rendering issues
    }
  }

  doc.fontSize(10).fillColor('#334155').text(`Website: ${getWebsiteUrl()}`, 340, 36, { align: 'right' });
  doc.text(`Office: ${COMPANY_DETAILS.officeAddress.replace(/\n/g, ', ')}`, 340, 52, { align: 'right', width: 220 });
  doc.text(`Email: ${COMPANY_DETAILS.contactEmail}`, 340, 80, { align: 'right', width: 220 });

  doc.moveDown(3);
  doc.fontSize(15).fillColor('#0f172a').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).text(COMPANY_DETAILS.legalName, { align: 'center' });
  doc.text(`DBA: ${COMPANY_DETAILS.dba}`, { align: 'center' });
  doc.moveDown(1);
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
      drawHeader(doc, isStage1 ? 'INVOICE - CAREER DEVELOPMENT SERVICES (Part I)' : 'INVOICE - CAREER DEVELOPMENT SERVICES (Part II)');

      doc.fontSize(12).text('Invoice Details');
      doc.fontSize(11).text(`Invoice Number: ${invoiceNumber}`);
      doc.text(`Issue Date: ${issueDate.toLocaleDateString('en-US')}`);
      doc.text(`Candidate ID: ${String(candidate._id)}`);
      doc.text(`PDF Reference: ${pdfReferenceNumber}`);
      doc.moveDown();

      doc.fontSize(12).text('Bill To Candidate');
      doc.fontSize(11).text(`Full Name: ${details.name}`);
      doc.text(`Email: ${details.email}`);
      doc.text(`Country: ${details.country}`);
      doc.moveDown();

      doc.fontSize(12).text('Service Description');
      doc.fontSize(11).text(
        isStage1
          ? 'Career Development & Candidate Advisory Services Including initial evaluation, profile assessment, eligibility review, and onboarding processing.'
          : 'Career Development & Candidate Advisory Services Including employer coordination, interview facilitation, profile enhancement, and onboarding support.',
        { width: 510 }
      );
      doc.moveDown();

      doc.fontSize(12).text('Payment Summary');
      doc.fontSize(11).text('Total Program Fee: USD $6,200');
      if (isStage1) {
        doc.text('Amount Due (Stage 1 Payment): USD $3,100');
        doc.text('Payment Status: DUE');
        doc.text('Remaining Balance After Payment: USD $3,100');
      } else {
        doc.text(`Amount Received: USD $${Number(amountReceived || 3100).toLocaleString('en-US')}`);
        doc.text('Amount Due (Final Payment): USD $3,100');
        doc.text('Payment Status: FINAL PAYMENT DUE');
      }
      doc.moveDown();

      doc.fontSize(12).text('Notes');
      doc.fontSize(11).text(
        isStage1
          ? '- This invoice represents the first installment of a structured career development service program.\n- Completion of this payment initiates onboarding and document submission access.\n- Final outcomes are subject to eligibility, verification, and external employer decisions.'
          : '- This invoice represents the final installment of the structured service program.\n- Final onboarding and employer integration will proceed only after full settlement.\n- All services are subject to candidate verification and employer selection outcomes.',
        { width: 510 }
      );
      doc.moveDown();

      doc.fontSize(12).text('Payment Terms');
      doc.fontSize(11).text(
        isStage1
          ? '- Payment is due upon issuance\n- Payment confirms acceptance of service terms and onboarding initiation\n- Non-payment may result in cancellation of application processing'
          : '- Payment must be completed prior to final onboarding\n- Failure to complete payment may result in suspension or cancellation of services\n- Previous payment terms and refund policies remain applicable as per agreement',
        { width: 510 }
      );
      doc.moveDown();

      doc.fontSize(11).text(COMPANY_DETAILS.legalName);
      doc.text(`DBA: ${COMPANY_DETAILS.dba}`);
      doc.text(COMPANY_DETAILS.officeAddress);
      doc.text(getWebsiteUrl());
      doc.text(COMPANY_DETAILS.contactEmail);
      doc.moveDown();
      doc.fontSize(10).text('Disclaimer: This invoice is system-generated and valid without signature.');
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
    totalProgramFee: 6200,
    amountReceived: isStage1 ? 0 : Number(amountReceived || 3100),
    amountDue: 3100,
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

  const stageTitle = stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE
    ? 'INITIAL ONBOARDING & PROFILE EVALUATION FEE'
    : stage === PAYMENT_STAGES.FIRST_INSTALLMENT
      ? 'FIRST INSTALLMENT - CAREER DEVELOPMENT & PROCESSING SERVICES'
      : 'FINAL PAYMENT - POST SELECTION PROCESSING';

  await writeDocument({
    filePath,
    build: (doc) => {
      drawHeader(doc, `PAYMENT RECEIPT\n${stageTitle}`);

      doc.fontSize(11).text(`Receipt No.: ${receiptNumber}`);
      doc.text(`Date: ${new Date(date).toLocaleDateString('en-US')}`);
      doc.text(`PDF Reference: ${pdfReferenceNumber}`);
      doc.moveDown();

      doc.fontSize(12).text('Received From');
      doc.fontSize(11).text(`Candidate Name: ${details.name}`);
      doc.text(`Email Address: ${details.email}`);
      doc.text(`Country: ${details.country}`);
      doc.text(`Phone Number: ${details.phone}`);
      doc.moveDown();

      doc.fontSize(12).text('Payment Details');
      doc.fontSize(11).text(`Amount Received: USD $${Number(payment?.amount || 0).toLocaleString('en-US')}`);
      if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) {
        doc.text('Purpose: Initial onboarding, profile evaluation, administrative review, candidate assessment, and preliminary career development services.');
        doc.text('Payment Method: Stripe / Online Payment Gateway');
        doc.text(`Transaction ID: ${payment?.stripeChargeId || payment?.stripePaymentIntentId || payment?.transactionId || 'N/A'}`);
        doc.moveDown(0.3);
        doc.text('Important Note: This payment is strictly non-refundable as per the agreed policy.', { width: 510 });
      } else if (stage === PAYMENT_STAGES.FIRST_INSTALLMENT) {
        doc.text('Payment Method: Bank Transfer / Wire Transfer');
        doc.text(`Transaction Reference Number: ${payment?.bankTransactionReference || payment?.transactionId || 'N/A'}`);
        doc.moveDown(0.3);
        doc.text('Refund Conditions: If not selected after interviews, USD $200 deduction applies and USD $2,900 may be refunded. If selected and candidate declines/fails to join, this payment becomes non-refundable.', { width: 510 });
      } else {
        doc.text('Purpose: Final onboarding, employer integration support, administrative coordination, and operational processing.');
        doc.text('Payment Method: Bank Transfer / Wire Transfer');
        doc.text(`Transaction Reference Number: ${payment?.bankTransactionReference || payment?.transactionId || 'N/A'}`);
      }
      doc.moveDown();

      doc.text('Authorized By:');
      doc.text(COMPANY_DETAILS.legalName);
      doc.text(`DBA: ${COMPANY_DETAILS.dba}`);
      doc.moveDown();
      doc.text(COMPANY_DETAILS.officeAddress);
      doc.text(getWebsiteUrl());
      doc.text(COMPANY_DETAILS.contactEmail);
      doc.moveDown();
      doc.fontSize(10).text('Disclaimer: This receipt is system-generated and valid without signature.');
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
    transactionReferenceNumber: payment?.bankTransactionReference || payment?.transactionId || '',
    pdfUrl: `/uploads/payment-receipts/system/${fileName}`,
    pdfPath: filePath,
    pdfReferenceNumber,
  });

  return receipt;
};

module.exports = {
  generateInvoiceForStage,
  generateReceiptForPayment,
};
