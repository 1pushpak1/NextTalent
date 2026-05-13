const mongoose = require('mongoose');

const agreementConsentSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentType: {
      type: String,
      enum: ['privacy_policy', 'payment_refund_policy', 'terms_conditions', 'document_authenticity_declaration', 'candidate_services_agreement'],
      required: true,
      index: true,
    },
    documentVersion: { type: String, required: true },
    consentId: { type: String, required: true, unique: true, index: true },
    transactionId: { type: String, required: true, index: true },
    candidateTypedName: { type: String, required: true },
    drawnSignatureDataUrl: { type: String, default: '' },
    signatureFilePath: { type: String, default: '' },
    checkboxAcknowledged: { type: Boolean, required: true },
    scrolledToEnd: { type: Boolean, required: true },
    signedAt: { type: Date, required: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    pdfPath: { type: String, default: '' },
    pdfReferenceNumber: { type: String, default: '' },
    emailedToCandidate: { type: Boolean, default: false },
    emailLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailLog', default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

agreementConsentSchema.index({ candidateId: 1, documentType: 1, documentVersion: 1 }, { unique: true });

module.exports = mongoose.model('AgreementConsent', agreementConsentSchema);
