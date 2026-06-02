const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    phone: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['candidate', 'admin'], default: 'candidate' },
    status: { type: String, default: 'eligibility_approved' },
    
    // New workflow fields
    evaluationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    evaluationApprovedBy: { type: String, default: '' },
    evaluationApprovedAt: { type: Date, default: null },
    evaluationRejectedBy: { type: String, default: '' },
    evaluationRejectedAt: { type: Date, default: null },
    
    operationsStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    operationsApprovedBy: { type: String, default: '' },
    operationsApprovedAt: { type: Date, default: null },
    operationsRejectedBy: { type: String, default: '' },
    operationsRejectedAt: { type: Date, default: null },
    
    accountStatus: { type: String, enum: ['not_invited', 'invited', 'created', 'email_verified'], default: 'not_invited' },
    accountInviteToken: { type: String, default: '' },
    accountInviteExpiresAt: { type: Date, default: null },
    accountCreationInviteSent: { type: Boolean, default: false },
    accountCreationInviteSentAt: { type: Date, default: null },
    
    paymentStatus: {
      onboarding: { type: String, enum: ['pending', 'paid'], default: 'pending' },
      program: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      final: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    },
    
    documentStatus: { type: String, enum: ['not_uploaded', 'uploaded', 'under_review', 'accepted', 'needs_revision'], default: 'not_uploaded' },
    selectionStatus: { type: String, enum: ['pending', 'selected', 'rejected'], default: 'pending' },
    
    stageStatuses: { type: Map, of: String, default: {} },
    assignedHiringPartner: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    declarationConsent: { type: Object, default: null },

    candidateId: { type: String, default: '' },
    applicationSubmittedAt: { type: Date, default: null },
    operationsDecision: { type: String, default: '' },
    operationsCompletedAt: { type: Date, default: null },
    selectedStatus: { type: String, default: 'pending' },
    selectedBy: { type: String, default: '' },
    selectedAt: { type: Date, default: null },
    admin1ProgressionApproved: { type: Boolean, default: false },
    admin1ProgressionApprovedAt: { type: Date, default: null },
    admin1ProgressionApprovedBy: { type: String, default: '' },
    admin2EvaluationApproved: { type: Boolean, default: false },
    admin2EvaluationApprovedAt: { type: Date, default: null },
    admin2EvaluationApprovedBy: { type: String, default: '' },
    admin3EvaluationApproved: { type: Boolean, default: false },
    admin3EvaluationApprovedAt: { type: Date, default: null },
    admin3EvaluationApprovedBy: { type: String, default: '' },
    documentationStageInitiated: { type: Boolean, default: false },
    documentationStageInitiatedAt: { type: Date, default: null },
    documentationStageInitiatedBy: { type: String, default: '' },

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
