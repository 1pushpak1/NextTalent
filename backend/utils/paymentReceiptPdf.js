const fs = require('fs');
const path = require('path');
const { PAYMENT_STAGES, PAYMENT_STAGE_CONFIG } = require('../constants/workflow');
const { buildStorageKey, renderPdfToBuffer, storeBuffer } = require('./storage');

const getFrontendBaseUrl = () =>
  String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'https://nextsteptalent.net').replace(/\/+$/, '');

const getLogoPath = () =>
  process.env.BRAND_LOGO_PATH || path.resolve(__dirname, '../../frontend/public/logo.png');

const buildReceiptReference = (payment) => `NST-INIT-${String(payment?._id || '').slice(-8).toUpperCase()}`;
const buildProgramReceiptReference = (payment) => `NST-PROG-${String(payment?._id || '').slice(-8).toUpperCase()}`;
const buildFinalReceiptReference = (payment) => `NST-FINAL-${String(payment?._id || '').slice(-8).toUpperCase()}`;

const renderReceipt = async ({ title, subtitle, payment, candidate, profile, reference, amountLabel, extraLines = [] }) => {
  const website = process.env.WEBSITE_URL || getFrontendBaseUrl();
  const officeAddress = process.env.COMPANY_OFFICE_ADDRESS || '8735 Dunwoody Place, STE N, Atlanta, GA 30350, United States';

  return renderPdfToBuffer((doc) => {
    doc.fontSize(14).text('NextStep Talent', { align: 'center' });
    doc.moveDown(0.25);
    doc.fontSize(12).text(title, { align: 'center' });
    doc.fontSize(10).text(subtitle, { align: 'center' });
    doc.moveDown();

    if (fs.existsSync(getLogoPath())) {
      try {
        doc.image(getLogoPath(), 40, 30, { fit: [120, 50] });
      } catch {
        // ignore logo failures
      }
    }

    doc.fontSize(9).text(`Website: ${website}`, { align: 'right' });
    doc.text(`Office: ${officeAddress}`, { align: 'right' });
    doc.text('Email: contact@NextStepTalent.net', { align: 'right' });
    doc.moveDown();

    doc.fontSize(11).text(`Reference: ${reference}`);
    doc.text(`Candidate: ${candidate?.name || 'N/A'}`);
    doc.text(`Email: ${candidate?.email || 'N/A'}`);
    doc.text(`Country: ${profile?.personalDetails?.currentCountryOfResidence || 'N/A'}`);
    doc.moveDown();
    doc.fontSize(11).text(amountLabel);
    extraLines.forEach((line) => doc.text(line));
    doc.moveDown();
    doc.text('This receipt is system-generated and valid without signature.');
  });
};

const saveReceipt = async ({ storageKey, buffer }) =>
  storeBuffer({
    storageKey,
    buffer,
    contentType: 'application/pdf',
  });

const generateInitialPaymentReceiptPdf = async ({ payment, candidate, profile }) => {
  const receiptNo = buildReceiptReference(payment);
  const fileName = `initial-payment-receipt-${receiptNo}.pdf`;
  const storageKey = buildStorageKey({ folder: 'payment-receipts', subfolder: 'system', filename: fileName });

  const buffer = await renderReceipt({
    title: 'PAYMENT RECEIPT',
    subtitle: 'INITIAL ONBOARDING & PROFILE EVALUATION FEE',
    payment,
    candidate,
    profile,
    reference: receiptNo,
    amountLabel: `Amount Received: USD $${Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.INITIAL_ONBOARDING_FEE].amount || 0).toLocaleString('en-US')}`,
    extraLines: [
      'Purpose of Payment: Initial onboarding, profile evaluation, administrative review, candidate assessment, and preliminary career development services.',
      'Payment Method: Stripe / Online Payment Gateway',
      `Transaction ID: ${payment?.transactionId || 'N/A'}`,
    ],
  });
  const storedFile = await saveReceipt({ storageKey, buffer });
  return { receiptNo, receiptUrl: storedFile.fileUrl };
};

const generateProgramPaymentReceiptPdf = async ({ payment, candidate, profile }) => {
  const receiptNo = buildProgramReceiptReference(payment);
  const fileName = `program-payment-receipt-${receiptNo}.pdf`;
  const storageKey = buildStorageKey({ folder: 'payment-receipts', subfolder: 'system', filename: fileName });

  const buffer = await renderReceipt({
    title: 'PAYMENT RECEIPT',
    subtitle: 'FIRST INSTALLMENT - CAREER DEVELOPMENT & PROCESSING SERVICES',
    payment,
    candidate,
    profile,
    reference: receiptNo,
    amountLabel: 'Amount Received: USD $3,100',
    extraLines: [
      'Payment Includes: Professional advisory and onboarding services; candidate profile optimization; employer coordination and operational processing; administrative handling; banking and transfer charges.',
      'Payment Method: Bank Transfer / Wire Transfer',
      `Transaction Reference Number: ${payment?.bankReference || payment?.transactionId || 'N/A'}`,
    ],
  });
  const storedFile = await saveReceipt({ storageKey, buffer });
  return { receiptNo, receiptUrl: storedFile.fileUrl };
};

const generateFinalPaymentReceiptPdf = async ({ payment, candidate, profile }) => {
  const receiptNo = buildFinalReceiptReference(payment);
  const fileName = `final-payment-receipt-${receiptNo}.pdf`;
  const storageKey = buildStorageKey({ folder: 'payment-receipts', subfolder: 'system', filename: fileName });

  const buffer = await renderReceipt({
    title: 'PAYMENT RECEIPT',
    subtitle: 'FINAL PAYMENT - POST SELECTION PROCESSING',
    payment,
    candidate,
    profile,
    reference: receiptNo,
    amountLabel: 'Amount Received: USD $3,100',
    extraLines: [
      'Purpose of Payment: Final onboarding, employer integration support, administrative coordination, operational processing, and completion of career development and candidate support services.',
      'Payment Method: Bank Transfer / Wire Transfer',
      `Transaction Reference Number: ${payment?.bankReference || payment?.transactionId || 'N/A'}`,
    ],
  });
  const storedFile = await saveReceipt({ storageKey, buffer });
  return { receiptNo, receiptUrl: storedFile.fileUrl };
};

module.exports = {
  generateInitialPaymentReceiptPdf,
  generateProgramPaymentReceiptPdf,
  generateFinalPaymentReceiptPdf,
};
