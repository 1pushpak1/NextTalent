const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const generatePdf = async (profile) => {
  const pdfDir = path.join(__dirname, '..', 'uploads', 'pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const fileName = `profile-${profile._id}.pdf`;
  const filePath = path.join(pdfDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);
    doc.fontSize(18).text('NextStep Talent - Candidate Profile Summary');
    doc.moveDown();
    doc.fontSize(12).text(`Profile ID: ${profile._id}`);
    doc.text(`Status: ${profile.status}`);
    doc.text(`Created: ${new Date(profile.createdAt).toLocaleString()}`);
    doc.moveDown();
    doc.text('Personal Details:');
    doc.text(JSON.stringify(profile.personalDetails, null, 2));
    doc.moveDown();
    doc.text('Education:');
    doc.text(JSON.stringify(profile.education, null, 2));
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return `/uploads/pdfs/${fileName}`;
};

module.exports = generatePdf;
