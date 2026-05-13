const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const getFrontendBaseUrl = () =>
  String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'https://nextsteptalent.net').replace(/\/+$/, '');

const getLogoPath = () =>
  process.env.BRAND_LOGO_PATH || path.resolve(__dirname, '../../frontend/public/logo.png');

const buildReceiptReference = (payment) => `NST-INIT-${String(payment?._id || '').slice(-8).toUpperCase()}`;
const buildProgramReceiptReference = (payment) => `NST-PROG-${String(payment?._id || '').slice(-8).toUpperCase()}`;
const buildFinalReceiptReference = (payment) => `NST-FINAL-${String(payment?._id || '').slice(-8).toUpperCase()}`;

const generateInitialPaymentReceiptPdf = async ({ payment, candidate, profile }) => {
  const receiptDir = path.join(__dirname, '..', 'uploads', 'payment-receipts', 'system');
  fs.mkdirSync(receiptDir, { recursive: true });

  const receiptNo = buildReceiptReference(payment);
  const fileName = `initial-payment-receipt-${receiptNo}.pdf`;
  const filePath = path.join(receiptDir, fileName);
  const website = process.env.WEBSITE_ADDRESS || getFrontendBaseUrl();
  const officeAddress =
    process.env.COMPANY_OFFICE_ADDRESS ||
    '8735 Dunwoody Place, STE N, Atlanta, GA 30350, United States';

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 24;

    // White page background to ensure readable output in all PDF viewers
    doc
      .rect(0, 0, pageWidth, pageHeight)
      .fill('#ffffff');

    // Outer border
    doc
      .lineWidth(1.2)
      .strokeColor('#002147')
      .roundedRect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 8)
      .stroke();

    // Subtle inner border
    doc
      .lineWidth(0.6)
      .strokeColor('#d9c28a')
      .roundedRect(margin + 8, margin + 8, pageWidth - (margin + 8) * 2, pageHeight - (margin + 8) * 2, 6)
      .stroke();

    // Watermark
    doc.save();
    doc.rotate(-30, { origin: [pageWidth / 2, pageHeight / 2] });
    doc
      .fillColor('#002147')
      .opacity(0.06)
      .fontSize(62)
      .text('NEXTSTEP TALENT', pageWidth * 0.12, pageHeight * 0.45, {
        width: pageWidth * 0.76,
        align: 'center',
      });
    doc.opacity(1);
    doc.restore();

    if (fs.existsSync(getLogoPath())) {
      try {
        doc.image(getLogoPath(), 46, 38, { fit: [130, 52] });
      } catch {
        // proceed without logo if file format/permissions fail
      }
    }

    const contentX = 56;
    const contentWidth = pageWidth - contentX * 2;

    doc.fontSize(10).fillColor('#0f172a').text(`Website: ${website}`, 340, 40, { align: 'right' });
    doc.text(`Office: ${officeAddress}`, 340, 56, { align: 'right', width: 210 });
    doc.text('Email: contact@NextStepTalent.net', 340, 84, { align: 'right' });

    doc.moveTo(40, 104).lineTo(pageWidth - 40, 104).lineWidth(0.8).strokeColor('#d9c28a').stroke();

    let y = 126;
    doc.fontSize(17).fillColor('#002147').text('PAYMENT RECEIPT', contentX, y, { width: contentWidth, align: 'center' });
    y += 28;
    doc.fontSize(11.5).fillColor('#0f172a').text('INITIAL ONBOARDING & PROFILE EVALUATION FEE', contentX, y, { width: contentWidth, align: 'center' });
    y += 22;
    doc.fontSize(11).fillColor('#111827').text('NG Global Advisory and Consulting LLC.', contentX, y, { width: contentWidth, align: 'center' });
    y += 16;
    doc.text('DBA: NextStep Talent', contentX, y, { width: contentWidth, align: 'center' });
    y += 28;

    const receiptDate = new Date(payment?.createdAt || Date.now()).toLocaleDateString('en-US');
    doc.fontSize(11).fillColor('#111827').text(`Receipt No.: ${receiptNo}`, contentX, y, { width: contentWidth });
    y += 16;
    doc.text(`Date: ${receiptDate}`, contentX, y, { width: contentWidth });

    y += 26;
    doc.fontSize(12).fillColor('#002147').text('RECEIVED FROM', contentX, y, { width: contentWidth });
    y += 18;
    doc.fontSize(11).fillColor('#111827').text(`Candidate Name: ${candidate?.name || 'N/A'}`, contentX, y, { width: contentWidth });
    y += 16;
    doc.text(`Email Address: ${candidate?.email || 'N/A'}`, contentX, y, { width: contentWidth });
    y += 16;
    doc.text(`Country: ${profile?.personalDetails?.currentCountryOfResidence || 'N/A'}`, contentX, y, { width: contentWidth });
    y += 16;
    doc.text(`Phone Number: ${candidate?.phone || 'N/A'}`, contentX, y, { width: contentWidth });

    y += 26;
    doc.fontSize(12).fillColor('#002147').text('PAYMENT DETAILS', contentX, y, { width: contentWidth });
    y += 18;
    doc.fontSize(11).fillColor('#111827').text('Amount Received: USD $500', contentX, y, { width: contentWidth });
    y += 18;
    doc.text('Purpose of Payment:', contentX, y, { width: contentWidth });
    y += 16;
    doc.text(
      'Initial onboarding, profile evaluation, administrative review, candidate assessment, and preliminary career development services.',
      contentX,
      y,
      { width: contentWidth }
    );
    y = doc.y + 10;
    doc.text('Payment Method:', contentX, y, { width: contentWidth });
    y += 16;
    doc.text('Stripe / Online Payment Gateway', contentX, y, { width: contentWidth });
    y += 18;
    doc.text('Transaction ID:', contentX, y, { width: contentWidth });
    y += 16;
    doc.text(`${payment?.transactionId || 'N/A'}`, contentX, y, { width: contentWidth });

    y += 26;
    doc.fontSize(12).fillColor('#002147').text('IMPORTANT NOTE', contentX, y, { width: contentWidth });
    y += 18;
    doc.fontSize(11).fillColor('#111827').text(
      'This payment is strictly non-refundable as per the agreed Payment & Refund Policy and Candidate Services Agreement accepted during onboarding.',
      contentX,
      y,
      { width: contentWidth }
    );
    y = doc.y + 12;
    doc.text('Authorized By:', contentX, y, { width: contentWidth });
    y += 16;
    doc.text('NG Global Advisory and Consulting LLC.', contentX, y, { width: contentWidth });
    y += 16;
    doc.text('DBA: NextStep Talent', contentX, y, { width: contentWidth });

    y += 26;
    doc.fontSize(12).fillColor('#002147').text('DISCLAIMER', contentX, y, { width: contentWidth });
    y += 18;
    doc.fontSize(11).fillColor('#111827').text('This receipt is system-generated and valid without signature.', contentX, y, { width: contentWidth });
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return {
    receiptNo,
    receiptUrl: `/uploads/payment-receipts/system/${fileName}`,
  };
};

module.exports = {
  generateInitialPaymentReceiptPdf,
  generateProgramPaymentReceiptPdf: async ({ payment, candidate, profile }) => {
    const receiptDir = path.join(__dirname, '..', 'uploads', 'payment-receipts', 'system');
    fs.mkdirSync(receiptDir, { recursive: true });

    const receiptNo = buildProgramReceiptReference(payment);
    const fileName = `program-payment-receipt-${receiptNo}.pdf`;
    const filePath = path.join(receiptDir, fileName);
    const website = process.env.WEBSITE_ADDRESS || getFrontendBaseUrl();
    const officeAddress =
      process.env.COMPANY_OFFICE_ADDRESS ||
      '8735 Dunwoody Place, STE N, Atlanta, GA 30350, United States';

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 24;

      // White page background to ensure readable output in all PDF viewers
      doc
        .rect(0, 0, pageWidth, pageHeight)
        .fill('#ffffff');

      // Outer border
      doc
        .lineWidth(1.2)
        .strokeColor('#002147')
        .roundedRect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 8)
        .stroke();

      // Subtle inner border
      doc
        .lineWidth(0.6)
        .strokeColor('#d9c28a')
        .roundedRect(margin + 8, margin + 8, pageWidth - (margin + 8) * 2, pageHeight - (margin + 8) * 2, 6)
        .stroke();

      // Watermark
      doc.save();
      doc.rotate(-30, { origin: [pageWidth / 2, pageHeight / 2] });
      doc
        .fillColor('#002147')
        .opacity(0.06)
        .fontSize(58)
        .text('NEXTSTEP TALENT', pageWidth * 0.12, pageHeight * 0.45, {
          width: pageWidth * 0.76,
          align: 'center',
        });
      doc.opacity(1);
      doc.restore();

      if (fs.existsSync(getLogoPath())) {
        try {
          doc.image(getLogoPath(), 46, 38, { fit: [130, 52] });
        } catch {
          // proceed without logo
        }
      }

      const contentX = 56;
      const contentWidth = pageWidth - contentX * 2;

      doc.fontSize(10).fillColor('#0f172a').text(`Website: ${website}`, 340, 40, { align: 'right' });
      doc.text(`Office: ${officeAddress}`, 340, 56, { align: 'right', width: 210 });
      doc.text('Email: contact@NextStepTalent.net', 340, 84, { align: 'right' });

      doc.moveTo(40, 104).lineTo(pageWidth - 40, 104).lineWidth(0.8).strokeColor('#d9c28a').stroke();

      let y = 126;
      doc.fontSize(17).fillColor('#002147').text('PAYMENT RECEIPT', contentX, y, { width: contentWidth, align: 'center' });
      y += 28;
      doc.fontSize(11.5).fillColor('#0f172a').text('FIRST INSTALLMENT - CAREER DEVELOPMENT & PROCESSING SERVICES', contentX, y, { width: contentWidth, align: 'center' });
      y += 22;
      doc.fontSize(11).fillColor('#111827').text('NG Global Advisory and Consulting LLC.', contentX, y, { width: contentWidth, align: 'center' });
      y += 16;
      doc.text('DBA: NextStep Talent', contentX, y, { width: contentWidth, align: 'center' });
      y += 28;

      doc.fontSize(11).fillColor('#111827').text(`Receipt No.: ${receiptNo}`, contentX, y, { width: contentWidth });
      y += 16;
      doc.text(`Date: ${new Date(payment?.createdAt || Date.now()).toLocaleDateString('en-US')}`, contentX, y, { width: contentWidth });
      y += 26;

      doc.fontSize(12).fillColor('#002147').text('RECEIVED FROM', contentX, y, { width: contentWidth });
      y += 18;
      doc.fontSize(11).fillColor('#111827').text(`Candidate Name: ${candidate?.name || 'N/A'}`, contentX, y, { width: contentWidth });
      y += 16;
      doc.text(`Email Address: ${candidate?.email || 'N/A'}`, contentX, y, { width: contentWidth });
      y += 16;
      doc.text(`Country: ${profile?.personalDetails?.currentCountryOfResidence || 'N/A'}`, contentX, y, { width: contentWidth });
      y += 16;
      doc.text(`Phone Number: ${candidate?.phone || 'N/A'}`, contentX, y, { width: contentWidth });
      y += 26;

      doc.fontSize(12).fillColor('#002147').text('PAYMENT DETAILS', contentX, y, { width: contentWidth });
      y += 18;
      doc.fontSize(11).fillColor('#111827').text('Amount Received: USD $3,100', contentX, y, { width: contentWidth });
      y += 18;
      doc.text('Payment Includes:', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('- Professional advisory and onboarding services', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('- Candidate profile optimization', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('- Employer coordination and operational processing', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('- Administrative handling', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('- Banking and transfer charges', contentX, y, { width: contentWidth });
      y += 18;
      doc.text('Payment Method:', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('Bank Transfer / Wire Transfer', contentX, y, { width: contentWidth });
      y += 18;
      doc.text('Transaction Reference Number:', contentX, y, { width: contentWidth });
      y += 16;
      doc.text(`${payment?.bankReference || payment?.transactionId || 'N/A'}`, contentX, y, { width: contentWidth });
      y += 26;

      doc.fontSize(12).fillColor('#002147').text('REFUND CONDITIONS', contentX, y, { width: contentWidth });
      y += 18;
      doc.fontSize(11).fillColor('#111827').text('As per the signed Candidate Services Agreement:', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('- If the Candidate is not selected after interviews, USD $200 shall be deducted toward administrative and operational charges and USD $2,900 may be refunded.', contentX, y, { width: contentWidth });
      y = doc.y + 6;
      doc.text('- If the Candidate is selected and voluntarily declines or fails to join the employer, this payment becomes non-refundable.', contentX, y, { width: contentWidth });
      y = doc.y + 6;
      doc.text('- Applicable banking and processing charges remain non-refundable.', contentX, y, { width: contentWidth });
      y = doc.y + 12;

      doc.text('Authorized By:', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('NG Global Advisory and Consulting LLC.', contentX, y, { width: contentWidth });
      y += 16;
      doc.text('DBA: NextStep Talent', contentX, y, { width: contentWidth });
      y += 26;

      doc.fontSize(12).fillColor('#002147').text('DISCLAIMER', contentX, y, { width: contentWidth });
      y += 18;
      doc.fontSize(11).fillColor('#111827').text('This receipt is system-generated and valid without signature.', contentX, y, { width: contentWidth });
      doc.end();

      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return {
      receiptNo,
      receiptUrl: `/uploads/payment-receipts/system/${fileName}`,
    };
  },
  generateFinalPaymentReceiptPdf: async ({ payment, candidate, profile }) => {
    const receiptDir = path.join(__dirname, '..', 'uploads', 'payment-receipts', 'system');
    fs.mkdirSync(receiptDir, { recursive: true });

    const receiptNo = buildFinalReceiptReference(payment);
    const fileName = `final-payment-receipt-${receiptNo}.pdf`;
    const filePath = path.join(receiptDir, fileName);
    const website = process.env.WEBSITE_ADDRESS || getFrontendBaseUrl();
    const officeAddress =
      process.env.COMPANY_OFFICE_ADDRESS ||
      '8735 Dunwoody Place, STE N, Atlanta, GA 30350, United States';

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

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
      doc.fontSize(14).text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(11).text('FINAL PAYMENT - POST SELECTION PROCESSING', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).text('NG Global Advisory and Consulting LLC.');
      doc.text('DBA: NextStep Talent');
      doc.moveDown();
      doc.text(`Receipt No.: ${receiptNo}`);
      doc.text(`Date: ${new Date(payment?.createdAt || Date.now()).toLocaleDateString('en-US')}`);
      doc.moveDown();
      doc.fontSize(12).text('RECEIVED FROM');
      doc.moveDown(0.2);
      doc.fontSize(11).text(`Candidate Name: ${candidate?.name || 'N/A'}`);
      doc.text(`Email Address: ${candidate?.email || 'N/A'}`);
      doc.text(`Country: ${profile?.personalDetails?.currentCountryOfResidence || 'N/A'}`);
      doc.text(`Phone Number: ${candidate?.phone || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(12).text('PAYMENT DETAILS');
      doc.moveDown(0.2);
      doc.fontSize(11).text('Amount Received: USD $3,100');
      doc.moveDown(0.2);
      doc.text('Purpose of Payment:');
      doc.text(
        'Final onboarding, employer integration support, administrative coordination, operational processing, and completion of career development and candidate support services.',
        { width: 510 }
      );
      doc.moveDown(0.2);
      doc.text('Payment Method:');
      doc.text('Bank Transfer / Wire Transfer');
      doc.moveDown(0.2);
      doc.text('Transaction Reference Number:');
      doc.text(`${payment?.bankReference || payment?.transactionId || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(12).text('IMPORTANT NOTE');
      doc.moveDown(0.2);
      doc.fontSize(11).text(
        'This payment is processed following candidate selection/approval by the hiring company and forms part of the agreed professional service structure between the Candidate and NG Global Advisory and Consulting LLC. DBA NextStep Talent.',
        { width: 510 }
      );
      doc.moveDown();

      doc.text('Authorized By:');
      doc.text('NG Global Advisory and Consulting LLC.');
      doc.text('DBA: NextStep Talent');
      doc.moveDown();
      doc.fontSize(12).text('DISCLAIMER');
      doc.moveDown(0.2);
      doc.fontSize(11).text('This receipt is system-generated and valid without signature.');
      doc.end();

      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return {
      receiptNo,
      receiptUrl: `/uploads/payment-receipts/system/${fileName}`,
    };
  },
};
