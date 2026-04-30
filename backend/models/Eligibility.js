const mongoose = require('mongoose');

const eligibilitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    destination: { type: String, required: true },
    country: { type: String, required: true },
    hasITBackground: { type: Boolean, required: true },
    qualification: { type: String, required: true },
    languageAnswer: { type: String, required: true },
    currentLocation: { type: String, required: true },
    willingToRelocate: { type: Boolean, required: true },
    comfortableWithFees: { type: Boolean, required: true },
    isEligible: { type: Boolean, required: true },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Eligibility', eligibilitySchema);
