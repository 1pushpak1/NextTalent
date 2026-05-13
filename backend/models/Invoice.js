const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paymentStage: { type: String, required: true, index: true },
    issueDate: { type: Date, required: true },
    candidateName: { type: String, default: '' },
    candidateEmail: { type: String, default: '' },
    candidateCountry: { type: String, default: '' },
    totalProgramFee: { type: Number, default: 6200 },
    amountReceived: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    paymentStatus: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    pdfPath: { type: String, default: '' },
    pdfReferenceNumber: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
