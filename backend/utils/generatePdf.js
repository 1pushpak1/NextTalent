const PDFDocument = require('pdfkit');

const PROFILE_PDF_URL = '/api/profile/generated-pdf';

const getProfilePdfFileName = (profile) => {
  const fileName = `profile-${profile._id}.pdf`;
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
};

const writeProfilePdf = (doc, profile) => {
  doc.fontSize(18).text('NextStep Talent - Candidate Profile Summary');
  doc.moveDown();
  doc.fontSize(12).text(`Profile ID: ${profile._id}`);
  doc.text(`Status: ${profile.status}`);
  doc.text(`Created: ${profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'N/A'}`);
  doc.moveDown();
  doc.text('Personal Details:');
  doc.text(JSON.stringify(profile.personalDetails || {}, null, 2));
  doc.moveDown();
  doc.text('Education:');
  doc.text(JSON.stringify(profile.education || {}, null, 2));
};

const generateProfilePdfBuffer = async (profile) => {
  const fileName = getProfilePdfFileName(profile);
  const buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writeProfilePdf(doc, profile);
    doc.end();
  });

  return { buffer, fileName };
};

const generatePdf = async () => PROFILE_PDF_URL;

generatePdf.generateProfilePdfBuffer = generateProfilePdfBuffer;
generatePdf.getProfilePdfFileName = getProfilePdfFileName;
generatePdf.PROFILE_PDF_URL = PROFILE_PDF_URL;

module.exports = generatePdf;
