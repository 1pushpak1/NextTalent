const mongoose = require('mongoose');

const approvalAuditLogSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateEmail: { type: String, default: '' },
    approvalType: {
      type: String,
      enum: [
        'profile_evaluation',
        'document_verification',
        'payment_verification',
        'interview_selection',
        'final_selection',
        'admin_notes',
        'stage_action',
      ],
      required: true,
      index: true,
    },
    sectionRecordId: { type: String, default: '' },
    previousStatus: { type: String, default: '' },
    newStatus: { type: String, default: '' },
    decision: { type: String, enum: ['approved', 'rejected', 'changed', 'pending'], required: true },
    reasonNote: { type: String, required: true, maxlength: 2000 },
    adminRole: { type: String, default: '' },
    adminName: { type: String, default: '' },
    adminEmail: { type: String, default: '', index: true },
    adminIdentifier: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    sourcePage: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApprovalAuditLog', approvalAuditLogSchema);
