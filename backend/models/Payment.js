const mongoose = require('mongoose');
const { LEGACY_PAYMENT_TYPE_TO_STAGE, PAYMENT_STAGES } = require('../constants/workflow');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: { type: String, enum: ['initial', 'program', 'final'], default: undefined },
    stage: {
      type: String,
      enum: [
        PAYMENT_STAGES.INITIAL_ONBOARDING_FEE,
        PAYMENT_STAGES.FIRST_INSTALLMENT,
        PAYMENT_STAGES.FINAL_PAYMENT,
      ],
      default: undefined,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    method: { type: String, default: 'card' },
    status: { type: String, default: 'completed' },
    transactionId: { type: String, required: true, index: true },
    stripePaymentIntentId: { type: String, default: '' },
    stripeChargeId: { type: String, default: '' },
    bankTransactionReference: { type: String, default: '' },
    verifiedBy: { type: String, default: '' },
    verifiedAt: { type: Date, default: null },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt', default: null },
    receiptUrl: { type: String, default: '' },
    bankReference: { type: String, default: '' },
    refundableAmount: { type: Number, default: 0 },
    nonRefundableAmount: { type: Number, default: 0 },
    refundStatus: { type: String, default: '' },
    refundReason: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

paymentSchema.pre('save', function syncPaymentFields() {
  if (!this.candidateId && this.userId) {
    this.candidateId = this.userId;
  }
  if (!this.stage && this.type && LEGACY_PAYMENT_TYPE_TO_STAGE[this.type]) {
    this.stage = LEGACY_PAYMENT_TYPE_TO_STAGE[this.type];
  }
  if (!this.type && this.stage) {
    const inverse = Object.entries(LEGACY_PAYMENT_TYPE_TO_STAGE).find(([, value]) => value === this.stage);
    if (inverse) this.type = inverse[0];
  }
  if (!this.bankTransactionReference && this.bankReference) {
    this.bankTransactionReference = this.bankReference;
  }
  if (!this.bankReference && this.bankTransactionReference) {
    this.bankReference = this.bankTransactionReference;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
