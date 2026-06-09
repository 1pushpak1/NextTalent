const mongoose = require('mongoose');

const accountActivationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    candidateName: { type: String, default: '' },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null, index: true },
    usedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    issuedBy: { type: String, default: '' },
    issuedForCandidateId: { type: String, default: '' },
    issuedForUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

accountActivationSchema.index({ email: 1, tokenHash: 1 }, { unique: true });
accountActivationSchema.index({ email: 1, usedAt: 1, expiresAt: 1 });

module.exports = mongoose.model('AccountActivation', accountActivationSchema);
