const mongoose = require('mongoose');

const eligibilitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fullName: { type: String, default: '' },
    email: { type: String, required: true },
    destination: { type: String, required: true },
    country: { type: String, required: true },
    hasITBackground: { type: Boolean, required: true },
    qualification: { type: String, default: '' },
    languageAnswer: { type: String, required: true },
    currentLocation: { type: String, default: '' },
    willingToRelocate: { type: Boolean, default: null },
    comfortableWithFees: { type: Boolean, default: null },
    profileSubmittedAt: { type: Date, default: null },
    accountCreationInviteSent: { type: Boolean, default: false },
    accountCreationInviteSentAt: { type: Date, default: null },
    isEligible: { type: Boolean, required: true },
    rejectionReason: { type: String, default: '' },
    failedConditions: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Eligibility', eligibilitySchema);
