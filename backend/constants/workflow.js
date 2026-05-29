const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  EVALUATION_ADMIN: 'evaluation_admin',
  OPERATIONS_ADMIN: 'operations_admin',
});

const ADMIN_ROLE_ALIASES = Object.freeze({
  evaluation_admin: ADMIN_ROLES.EVALUATION_ADMIN,
  operations_admin: ADMIN_ROLES.OPERATIONS_ADMIN,
  super_admin: ADMIN_ROLES.SUPER_ADMIN,
});

const normalizeAdminRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  return ADMIN_ROLE_ALIASES[normalized] || normalized;
};

const PAYMENT_STAGES = Object.freeze({
  INITIAL_ONBOARDING_FEE: 'INITIAL_ONBOARDING_FEE',
  FIRST_INSTALLMENT: 'FIRST_INSTALLMENT',
  FINAL_PAYMENT: 'FINAL_PAYMENT',
});

const PAYMENT_STAGE_CONFIG = Object.freeze({
  [PAYMENT_STAGES.INITIAL_ONBOARDING_FEE]: {
    amount: 500,
    currency: 'USD',
    method: 'stripe',
    refundable: false,
    statuses: ['pending', 'paid', 'failed', 'cancelled'],
    receiptType: 'PAYMENT_RECEIPT_INITIAL_ONBOARDING',
  },
  [PAYMENT_STAGES.FIRST_INSTALLMENT]: {
    amount: 3100,
    currency: 'USD',
    method: 'bank_transfer',
    refundable: 'conditional',
    invoiceType: 'INVOICE_STAGE_1',
    receiptType: 'PAYMENT_RECEIPT_FIRST_INSTALLMENT',
    statuses: ['due', 'pending_review', 'verified', 'rejected', 'refunded', 'partially_refunded'],
  },
  [PAYMENT_STAGES.FINAL_PAYMENT]: {
    amount: 3100,
    currency: 'USD',
    method: 'bank_transfer',
    refundable: 'according_to_policy',
    invoiceType: 'INVOICE_STAGE_2',
    receiptType: 'PAYMENT_RECEIPT_FINAL_PAYMENT',
    statuses: ['due', 'pending_review', 'verified', 'rejected'],
  },
});

const LEGACY_PAYMENT_TYPE_TO_STAGE = Object.freeze({
  initial: PAYMENT_STAGES.INITIAL_ONBOARDING_FEE,
  program: PAYMENT_STAGES.FIRST_INSTALLMENT,
  final: PAYMENT_STAGES.FINAL_PAYMENT,
});

const COMPANY_DETAILS = Object.freeze({
  legalName: 'NG Global Advisory and Consulting LLC.',
  dba: 'NextStep Talent',
  officeAddress: '8735 Dunwoody Place Ste N\nAtlanta, GA 30350\nUnited States',
  contactEmail: 'contact@NextStepTalent.net',
  senderEmail: 'info@mail.ravviolabs.com',
  senderName: 'NextStep Talent',
});

const EMAIL_TEMPLATE_KEYS = Object.freeze({
  CANDIDATE_SUBMISSION_ADMIN_NOTICE: 'candidate_submission_admin_notice',
  CANDIDATE_SUBMISSION_CONFIRMATION: 'candidate_submission_confirmation',
  PROFILE_ACCOUNT_INVITE: 'profile_account_creation_invite',
  EVALUATION_APPROVED_NOTIFY_OPERATIONS: 'evaluation_approved_notify_operations',
  OPERATIONS_DECISION_COMPLETED: 'operations_decision_completed',
  CANDIDATE_REJECTION: 'candidate_rejection',
  CANDIDATE_SELECTED_PAYMENT: 'candidate_selected_payment',
  CANDIDATE_NOT_SELECTED: 'candidate_not_selected',
  INTERVIEW_INVITATION: 'interview_invitation',
  INTERVIEW_BOOKING_CONFIRMATION: 'interview_booking_confirmation',
  INTERVIEW_BOOKING_ADMIN_NOTICE: 'interview_booking_admin_notice',
  INVOICE_STAGE_1: 'invoice_stage_1',
  INVOICE_STAGE_2: 'invoice_stage_2',
  RECEIPT_INITIAL: 'receipt_initial',
  RECEIPT_FIRST: 'receipt_first',
  RECEIPT_FINAL: 'receipt_final',
  CONSENT_COPY: 'consent_copy',
});

module.exports = {
  ADMIN_ROLES,
  normalizeAdminRole,
  PAYMENT_STAGES,
  PAYMENT_STAGE_CONFIG,
  LEGACY_PAYMENT_TYPE_TO_STAGE,
  COMPANY_DETAILS,
  EMAIL_TEMPLATE_KEYS,
};
