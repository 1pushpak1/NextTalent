const fs = require('fs');
const path = require('path');
const { buildStorageKey, renderPdfToBuffer, storeBuffer } = require('./storage');

const generateDeclarationPdf = async ({ candidate, declarationAudit }) => {
  const fileName = `declaration-${declarationAudit?.consentId || Date.now()}.pdf`;
  const storageKey = buildStorageKey({
    folder: 'declarations',
    filename: fileName,
  });

  const buffer = await renderPdfToBuffer((doc) => {
    doc.fontSize(16).text('NextStep Talent - Candidate Document Authenticity Declaration');
    doc.moveDown(0.5);
    doc.fontSize(10).text(`PDF Reference: ${declarationAudit?.pdfReference || 'N/A'}`);
    doc.text(`Consent ID: ${declarationAudit?.consentId || 'N/A'}`);
    doc.text(`Transaction ID: ${declarationAudit?.transactionId || 'N/A'}`);
    doc.text(`Signed At: ${declarationAudit?.signedAt || 'N/A'}`);
    doc.text(`IP Address: ${declarationAudit?.ipAddress || 'N/A'}`);
    doc.text(`Candidate Name: ${declarationAudit?.typedLegalName || candidate?.name || 'N/A'}`);
    doc.text(`Candidate Email: ${candidate?.email || 'N/A'}`);
    doc.moveDown();
    doc.fontSize(12).text('Signature Method');
    doc.fontSize(10).text(`${declarationAudit?.signatureMethod || 'N/A'}`);
    doc.moveDown();
    doc.fontSize(12).text('Declaration');
    doc.fontSize(10).text('Candidate signed the Candidate Document Authenticity Declaration electronically after mandatory read/scroll completion and active consent acknowledgement.');
    doc.moveDown();
    doc.text(`Agree Checkbox: ${declarationAudit?.agreeChecked ? 'Yes' : 'No'}`);
    doc.text(`Read Completed: ${declarationAudit?.readCompleted ? 'Yes' : 'No'}`);
    doc.text(`Retention Until: ${declarationAudit?.retentionUntil || 'N/A'}`);
  });

  const storedFile = await storeBuffer({
    storageKey,
    buffer,
    contentType: 'application/pdf',
  });

  return {
    filePath: storedFile.fileUrl,
    fileName,
    fileUrl: storedFile.fileUrl,
  };
};

module.exports = {
  generateDeclarationPdf,
};
