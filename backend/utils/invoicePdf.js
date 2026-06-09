const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { buildStorageKey, renderPdfToBuffer, storeBuffer } = require('./storage');

const getFrontendBaseUrl = () =>
  String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'https://nextsteptalent.net').replace(/\/+$/, '');
const { PAYMENT_STAGES, PAYMENT_STAGE_CONFIG } = require('../constants/workflow');

const getLogoPath = () =>
  process.env.BRAND_LOGO_PATH || path.resolve(__dirname, '../../frontend/public/logo.png');
const uniqueInvoiceNo = () => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = String(Date.now()).slice(-6);
  return `NST-INV-${stamp}-${suffix}`;
};

const generateStage1InvoicePdf = async ({ candidate, profile }) => {
  const invoiceNumber = process.env.STAGE1_INVOICE_NUMBER || uniqueInvoiceNo();
  const fileName = `stage1-invoice-${String(candidate?._id || 'candidate')}.pdf`;
  const storageKey = buildStorageKey({
    folder: 'invoices',
    subfolder: 'system',
    filename: fileName,
  });
  const website = process.env.WEBSITE_URL || getFrontendBaseUrl();
  const officeAddress =
    process.env.COMPANY_OFFICE_ADDRESS ||
    '8735 Dunwoody Place, STE N, Atlanta, GA 30350, United States';

  const buffer = await renderPdfToBuffer((doc) => {

    if (fs.existsSync(getLogoPath())) {
      try {
        doc.image(getLogoPath(), 40, 34, { fit: [130, 50] });
      } catch {
        // proceed without logo
      }
    }

    doc.fontSize(10).text(`Website: ${website}`, 350, 36, { align: 'right' });
    doc.text(`Office: ${officeAddress}`, 350, 52, { align: 'right' });
    doc.text('Email: contact@NextStepTalent.net', 350, 68, { align: 'right' });

    doc.moveDown(3);
    doc.fontSize(14).text('INVOICE - CAREER DEVELOPMENT SERVICES (Part I)', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text('NG Global Advisory and Consulting LLC.');
    doc.text('DBA: NextStep Talent');
    doc.moveDown();

    doc.fontSize(12).text('INVOICE DETAILS');
    doc.moveDown(0.2);
    doc.fontSize(11).text(`Invoice Number: ${invoiceNumber}`);
    doc.text(`Issue Date: ${new Date().toLocaleDateString('en-US')}`);
    doc.text(`Candidate ID: ${String(candidate?._id || '')}`);
    doc.moveDown();

    doc.fontSize(12).text('BILL TO (CANDIDATE)');
    doc.moveDown(0.2);
    doc.fontSize(11).text(`Full Name: ${candidate?.name || 'N/A'}`);
    doc.text(`Email: ${candidate?.email || 'N/A'}`);
    doc.text(`Country: ${profile?.personalDetails?.currentCountryOfResidence || 'N/A'}`);
    doc.moveDown();

    doc.fontSize(12).text('SERVICE DESCRIPTION');
    doc.moveDown(0.2);
    doc.fontSize(11).text(
      'Career Development & Candidate Advisory Services (Including initial evaluation, profile assessment, eligibility review, and onboarding processing)',
      { width: 510 }
    );
    doc.moveDown();

    const totalProgramFee = Object.values(PAYMENT_STAGE_CONFIG).reduce((s, c) => s + Number(c.amount || 0), 0);
    const firstAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FIRST_INSTALLMENT].amount || 0);
    const finalAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0);
    doc.fontSize(12).text('PAYMENT SUMMARY');
    doc.moveDown(0.2);
    doc.fontSize(11).text(`Total Program Fee: USD $${totalProgramFee.toLocaleString('en-US')}`);
    doc.text(`Amount Due (Stage 1 Payment): USD $${firstAmount.toLocaleString('en-US')}`);
    doc.text('Payment Status: DUE');
    doc.text(`Remaining Balance After Payment: USD $${finalAmount.toLocaleString('en-US')}`);
    doc.moveDown();

    doc.fontSize(12).text('NOTES');
    doc.moveDown(0.2);
    doc.fontSize(11).text('- This invoice represents the first installment of a structured career development service program.');
    doc.text('- Completion of this payment initiates onboarding and document submission access.');
    doc.text('- Final outcomes are subject to eligibility, verification, and external employer decisions.');
    doc.moveDown();

    doc.fontSize(12).text('PAYMENT TERMS');
    doc.moveDown(0.2);
    doc.fontSize(11).text('- Payment is due upon issuance');
    doc.text('- Payment confirms acceptance of service terms and onboarding initiation');
    doc.text('- Non-payment may result in cancellation of application processing');
    doc.moveDown();

    doc.fontSize(12).text('COMPANY DETAILS');
    doc.moveDown(0.2);
    doc.fontSize(11).text('NG Global Advisory and Consulting LLC');
    doc.text('DBA: NextStep Talent');
    doc.moveDown();

    doc.fontSize(12).text('DISCLAIMER');
    doc.moveDown(0.2);
    doc.fontSize(11).text('This invoice is system-generated and valid without signature.');
  });

  const storedFile = await storeBuffer({
    storageKey,
    buffer,
    contentType: 'application/pdf',
  });

  return {
    invoiceNumber,
    invoiceUrl: storedFile.fileUrl,
  };
};

module.exports = {
  generateStage1InvoicePdf,
  generateStage2InvoicePdf: async ({ candidate, profile }) => {
    const invoiceNumber = process.env.STAGE2_INVOICE_NUMBER || uniqueInvoiceNo();
    const fileName = `stage2-invoice-${String(candidate?._id || 'candidate')}.pdf`;
    const storageKey = buildStorageKey({
      folder: 'invoices',
      subfolder: 'system',
      filename: fileName,
    });
    const website = process.env.WEBSITE_URL || getFrontendBaseUrl();
    const officeAddress =
      process.env.COMPANY_OFFICE_ADDRESS ||
      '8735 Dunwoody Place, STE N, Atlanta, GA 30350, United States';

    const buffer = await renderPdfToBuffer((doc) => {

      if (fs.existsSync(getLogoPath())) {
        try {
          doc.image(getLogoPath(), 40, 34, { fit: [130, 50] });
        } catch {
          // proceed without logo
        }
      }

      doc.fontSize(10).text(`Website: ${website}`, 350, 36, { align: 'right' });
      doc.text(`Office: ${officeAddress}`, 350, 52, { align: 'right' });
      doc.text('Email: contact@NextStepTalent.net', 350, 68, { align: 'right' });

      doc.moveDown(3);
      doc.fontSize(14).text('INVOICE - CAREER DEVELOPMENT SERVICES (Part II)', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).text('NG Global Advisory and Consulting LLC');
      doc.text('DBA: NextStep Talent');
      doc.moveDown();

      doc.fontSize(12).text('INVOICE DETAILS');
      doc.moveDown(0.2);
      doc.fontSize(11).text(`Invoice Number: ${invoiceNumber}`);
      doc.text(`Issue Date: ${new Date().toLocaleDateString('en-US')}`);
      doc.text(`Candidate ID: ${String(candidate?._id || '')}`);
      doc.moveDown();

      doc.fontSize(12).text('BILL TO (CANDIDATE)');
      doc.moveDown(0.2);
      doc.fontSize(11).text(`Full Name: ${candidate?.name || 'N/A'}`);
      doc.text(`Email: ${candidate?.email || 'N/A'}`);
      doc.text(`Country: ${profile?.personalDetails?.currentCountryOfResidence || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(12).text('SERVICE DESCRIPTION');
      doc.moveDown(0.2);
      doc.fontSize(11).text(
        'Career Development & Candidate Advisory Services (Including employer coordination, interview facilitation, profile enhancement, and onboarding support)',
        { width: 510 }
      );
      doc.moveDown();

      const totalProgramFee2 = Object.values(PAYMENT_STAGE_CONFIG).reduce((s, c) => s + Number(c.amount || 0), 0);
      const finalAmount2 = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0);
      doc.fontSize(12).text('PAYMENT SUMMARY');
      doc.moveDown(0.2);
      doc.fontSize(11).text(`Total Program Fee: USD $${totalProgramFee2.toLocaleString('en-US')}`);
      doc.text(`Amount Received: USD $${finalAmount2.toLocaleString('en-US')}`);
      doc.text(`Amount Due (Final Payment): USD $${finalAmount2.toLocaleString('en-US')}`);
      doc.text('Payment Status: FINAL PAYMENT DUE');
      doc.moveDown();

      doc.fontSize(12).text('NOTES');
      doc.moveDown(0.2);
      doc.fontSize(11).text('- This invoice represents the final installment of the structured service program.');
      doc.text('- Final onboarding and employer integration will proceed only after full settlement.');
      doc.text('- All services are subject to candidate verification and employer selection outcomes.');
      doc.moveDown();

      doc.fontSize(12).text('PAYMENT TERMS');
      doc.moveDown(0.2);
      doc.fontSize(11).text('- Payment must be completed prior to final onboarding');
      doc.text('- Failure to complete payment may result in suspension or cancellation of services');
      doc.text('- Previous payment terms and refund policies remain applicable as per agreement');
      doc.moveDown();

      doc.fontSize(12).text('COMPANY DETAILS');
      doc.moveDown(0.2);
      doc.fontSize(11).text('NG Global Advisory and Consulting LLC');
      doc.text('DBA: NextStep Talent');
      doc.moveDown();

      doc.fontSize(12).text('DISCLAIMER');
      doc.moveDown(0.2);
      doc.fontSize(11).text('This invoice is system-generated and valid without signature.');
    });

    const storedFile = await storeBuffer({
      storageKey,
      buffer,
      contentType: 'application/pdf',
    });

    return {
      invoiceNumber,
      invoiceUrl: storedFile.fileUrl,
    };
  },
};
