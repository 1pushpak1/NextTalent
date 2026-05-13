const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: [String], default: [] },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    subject: { type: String, default: '' },
    templateKey: { type: String, default: '' },
    relatedCandidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    relatedAdminActionId: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    errorMessage: { type: String, default: '' },
    sentAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.model('EmailLog', emailLogSchema);
