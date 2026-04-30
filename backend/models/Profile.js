const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    personalDetails: { type: Object, default: {} },
    education: { type: Object, default: {} },
    certifications: { type: Array, default: [] },
    workExperience: { type: Array, default: [] },
    skills: { type: Object, default: {} },
    languages: { type: Array, default: [] },
    additionalInfo: { type: String, default: '' },
    financialDisclosureAccepted: { type: Boolean, default: false },
    acknowledgementSigned: { type: Boolean, default: false },
    signature: { type: Object, default: null },
    generatedPdfUrl: { type: String, default: '' },
    savedStep: { type: Number, min: 1, max: 8, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'accepted', 'rejected'],
      default: 'draft',
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Profile', profileSchema);
