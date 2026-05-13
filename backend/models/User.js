const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['candidate', 'admin'], default: 'candidate' },
    status: { type: String, default: 'account_created' },
    stageStatuses: { type: Map, of: String, default: {} },
    assignedHiringPartner: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    declarationConsent: { type: Object, default: null },

    candidateId: { type: String, default: '' },
    applicationSubmittedAt: { type: Date, default: null },
    evaluationStatus: { type: String, default: 'pending' },
    evaluationApprovedBy: { type: String, default: '' },
    evaluationApprovedAt: { type: Date, default: null },
    operationsStatus: { type: String, default: 'pending' },
    operationsDecision: { type: String, default: '' },
    operationsApprovedBy: { type: String, default: '' },
    operationsCompletedAt: { type: Date, default: null },
    selectedStatus: { type: String, default: 'pending' },
    selectedBy: { type: String, default: '' },
    selectedAt: { type: Date, default: null },

    backgroundCheckStatus: {
      type: String,
      enum: ['not_started', 'initiated', 'in_progress', 'completed', 'failed', 'rejected'],
      default: 'not_started',
      index: true,
    },
    backgroundCheckProvider: { type: String, default: '' },
    backgroundCheckReferenceId: { type: String, default: '', index: true },
    backgroundCheckInitiatedAt: { type: Date, default: null },
    backgroundCheckCompletedAt: { type: Date, default: null },

    paymentStages: { type: [String], default: [] },
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    receipts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' }],
    interviewBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewBooking', default: null },
    auditTrailReferences: { type: [String], default: [] },

    phoneOtp: { type: String, default: '' },
    emailVerificationTokenHash: { type: String, default: '' },
    emailVerificationExpiresAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: '' },
    passwordResetExpiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

userSchema.pre('save', function ensureCandidateId() {
  if (this.role === 'candidate' && !this.candidateId && this._id) {
    this.candidateId = `NST-CAND-${String(this._id).slice(-8).toUpperCase()}`;
  }
});

module.exports = mongoose.model('User', userSchema);
