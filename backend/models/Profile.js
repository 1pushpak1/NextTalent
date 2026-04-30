const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    personalDetails: { type: Object, required: true },
    education: { type: Object, required: true },
    certifications: { type: Array, default: [] },
    workExperience: { type: Array, default: [] },
    skills: { type: Object, default: {} },
    languages: { type: Array, default: [] },
    additionalInfo: { type: String, default: '' },
    financialDisclosureAccepted: { type: Boolean, required: true },
    acknowledgementSigned: { type: Boolean, required: true },
    signature: { type: Object, required: true },
    generatedPdfUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'accepted', 'rejected'],
      default: 'submitted',
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Profile', profileSchema);
