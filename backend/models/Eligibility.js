const mongoose = require('mongoose');

const eligibilitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, default: '' },
    destination: { type: String, required: true },
    country: { type: String, required: true },
    hasITBackground: { type: Boolean, required: true },
    qualification: { type: String, default: '' },
    languageAnswer: { type: String, required: true },
    currentLocation: { type: String, required: true },
    willingToRelocate: { type: Boolean, default: null },
    comfortableWithFees: { type: Boolean, default: null },
    isEligible: { type: Boolean, required: true },
    rejectionReason: { type: String, default: '' },
    failedConditions: { type: [String], default: [] },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Eligibility', eligibilitySchema);
