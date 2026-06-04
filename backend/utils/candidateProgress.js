const stageLabels = {
  eligibility: 'Eligibility Applications',
  account: 'Account Created',
  profile_submitted: 'Profile Submitted',
  profile_review: 'Profile Review',
  operations_approval: 'Awaiting Operations Approval',
  initial_payment: 'Initial Payment',
  declaration: 'Declaration & Contract',
  documents_upload: 'Document Uploads',
  program_payment: 'Program Payment',
  document_verification: 'Document Verification',
  hiring: 'Hiring Partner Stage',
  selection: 'Selection Result',
  final_payment: 'Final Payment',
  testimonial: 'Testimonial',
  completed: 'Completed',
};

const toMapValue = (mapLike, key) => {
  if (!mapLike) return '';
  if (typeof mapLike.get === 'function') return mapLike.get(key) || '';
  return mapLike[key] || '';
};

const normalizeStatus = (value) => String(value || '').toLowerCase();

const paymentStatusLabel = (payment, paymentType) => {
  const target = payment.find((p) => p.type === paymentType);
  if (!target) return 'not_started';
  const status = normalizeStatus(target.status);
  if (status === 'completed') return 'verified';
  if (status === 'pending') return 'pending_verification';
  if (status === 'failed') return 'failed';
  if (status === 'refunded') return 'refunded';
  return status || 'unknown';
};

const isAccountCreated = (candidate) => {
  const accountStatus = normalizeStatus(candidate?.accountStatus);
  const workflowStatus = normalizeStatus(candidate?.status);
  return ['created', 'email_verified'].includes(accountStatus) || ['account_created', 'email_verified'].includes(workflowStatus);
};

const deriveCandidateProgress = ({ candidate, profile, eligibility, documents = [], interviews = [], payments = [], testimonial }) => {
  const profileStatus = profile?.status || 'not_submitted';
  const eligibilityStatus = eligibility?.isEligible === true ? 'eligible' : eligibility ? 'not_eligible' : 'not_started';
  const evaluationStatus = normalizeStatus(candidate?.evaluationStatus) || (normalizeStatus(candidate?.status) === 'evaluation_approved' ? 'approved' : 'pending');
  const operationsStatus = normalizeStatus(candidate?.operationsStatus) || (normalizeStatus(candidate?.status) === 'fully_approved' ? 'approved' : 'pending');
  const emailVerified = Boolean(candidate?.emailVerified);
  const phoneVerified = Boolean(candidate?.phoneVerified);
  const admin2EvaluationApproved = Boolean(candidate?.admin2EvaluationApproved) || normalizeStatus(candidate?.status) === 'evaluation_approved' || evaluationStatus === 'approved';
  const admin3EvaluationApproved = Boolean(candidate?.admin3EvaluationApproved) || normalizeStatus(candidate?.status) === 'fully_approved' || operationsStatus === 'approved';
  const evaluationApproved = evaluationStatus === 'approved' || admin2EvaluationApproved;
  const evaluationRejected = evaluationStatus === 'rejected' || normalizeStatus(candidate?.status) === 'evaluation_rejected';
  const operationsApproved = operationsStatus === 'approved' || admin3EvaluationApproved;
  const operationsRejected = operationsStatus === 'rejected' || normalizeStatus(candidate?.status) === 'operations_rejected';
  const accountCreated = isAccountCreated(candidate);

  const docsStatus =
    !documents.length ? 'not_uploaded' :
      documents.some((d) => d.status === 'Needs Revision') ? 'needs_revision' :
        documents.every((d) => d.status === 'Accepted') ? 'verified' :
          documents.some((d) => d.status === 'Under Review') ? 'under_review' : 'uploaded';

  const initialPaymentStatus = paymentStatusLabel(payments, 'initial');
  const programPaymentStatus = paymentStatusLabel(payments, 'program');
  const finalPaymentStatus = paymentStatusLabel(payments, 'final');

  const stageStatuses = {
    evaluation: normalizeStatus(toMapValue(candidate?.stageStatuses, 'evaluation')),
    declaration: normalizeStatus(toMapValue(candidate?.stageStatuses, 'declaration')),
    documentVerification: normalizeStatus(toMapValue(candidate?.stageStatuses, 'document-verification')),
    hiring: normalizeStatus(toMapValue(candidate?.stageStatuses, 'hiring')),
    selection: normalizeStatus(toMapValue(candidate?.stageStatuses, 'selection')),
  };

  const interviewStatus = 'not_required';
  const selectionStatus =
    stageStatuses.selection === 'accepted' || normalizeStatus(candidate?.status) === 'selected' ? 'selected' :
      stageStatuses.selection === 'rejected' || normalizeStatus(candidate?.status) === 'not_selected' || normalizeStatus(candidate?.status) === 'rejected' ? 'rejected' :
        stageStatuses.selection === 'under_review' || normalizeStatus(candidate?.status) === 'sent_to_partners' ? 'under_review' : 'pending';

  const base = {
    profileStatus,
    evaluationStatus: candidate?.evaluationStatus || profileStatus,
    operationsStatus: candidate?.operationsStatus || 'pending',
    paymentStatus: {
      initial: initialPaymentStatus,
      program: programPaymentStatus,
      final: finalPaymentStatus,
    },
    documentStatus: docsStatus,
    interviewStatus,
    selectionStatus,
    eligibilityStatus,
    verificationStatus: {
      emailVerified,
      phoneVerified,
    },
  };

  if (evaluationRejected || profileStatus === 'rejected') {
    return {
      ...base,
      currentStageKey: 'profile_review',
      currentStage: stageLabels.profile_review,
      nextAction: 'Application closed after evaluation rejection',
      pendingFrom: 'completed',
      recommendedAdminAction: 'No action needed',
    };
  }

  if (operationsRejected) {
    return {
      ...base,
      currentStageKey: 'operations_approval',
      currentStage: stageLabels.operations_approval,
      nextAction: 'Application closed after operations rejection',
      pendingFrom: 'completed',
      recommendedAdminAction: 'No action needed',
    };
  }

  if (!evaluationApproved) {
    return {
      ...base,
      currentStageKey: 'profile_review',
      currentStage: stageLabels.profile_review,
      nextAction: 'Awaiting Admin Approval',
      pendingFrom: 'admin',
      recommendedAdminAction: 'Review Internal Evaluation',
    };
  }

  if (!operationsApproved) {
    return {
      ...base,
      currentStageKey: 'operations_approval',
      currentStage: stageLabels.operations_approval,
      nextAction: 'Awaiting Operations Approval',
      pendingFrom: 'admin',
      recommendedAdminAction: 'Approve Candidate',
    };
  }

  if (!accountCreated) {
    const accountInvited = normalizeStatus(candidate?.accountStatus) === 'invited' || Boolean(candidate?.accountCreationInviteSent);
    return {
      ...base,
      currentStageKey: 'account',
      currentStage: stageLabels.account,
      nextAction: 'Create Account',
      pendingFrom: accountInvited ? 'candidate' : 'admin',
      recommendedAdminAction: accountInvited ? 'Wait for candidate to create account' : 'Send account invitation',
    };
  }

  if (!emailVerified) {
    return {
      ...base,
      currentStageKey: 'account',
      currentStage: stageLabels.account,
      nextAction: 'Verify Email',
      pendingFrom: 'candidate',
      recommendedAdminAction: 'Wait for candidate action',
    };
  }

  const steps = [
    {
      key: 'eligibility',
      done: eligibilityStatus === 'eligible',
      pendingFrom: eligibilityStatus === 'eligible' ? 'completed' : 'candidate',
      action: 'Complete eligibility check',
      recommendation: 'Wait for candidate to submit eligibility form',
    },
    {
      key: 'profile_submitted',
      done: ['submitted', 'under_review', 'accepted', 'rejected'].includes(profileStatus),
      pendingFrom: ['submitted', 'under_review', 'accepted', 'rejected'].includes(profileStatus) ? 'completed' : 'candidate',
      action: 'Submit profile',
      recommendation: 'Wait for candidate profile submission',
    },
    {
      key: 'profile_review',
      done: ['accepted', 'rejected'].includes(profileStatus),
      pendingFrom: ['accepted', 'rejected'].includes(profileStatus) ? 'completed' : 'admin',
      action: 'Review profile and decide',
      recommendation: 'Open candidate profile and approve/reject evaluation',
    },
    {
      key: 'operations_approval',
      done: !evaluationApproved || operationsApproved,
      pendingFrom: evaluationApproved && !operationsApproved ? 'admin' : 'completed',
      action: 'Awaiting Operations Approval',
      recommendation: 'Approve Candidate',
    },
    {
      key: 'account',
      done: accountCreated && emailVerified,
      pendingFrom: accountCreated ? (emailVerified ? 'completed' : 'candidate') : operationsApproved ? 'admin' : 'completed',
      action: accountCreated ? 'Verify Email' : 'Create Account',
      recommendation: accountCreated ? 'Wait for candidate account verification after approval' : 'Send account invitation after operations approval',
    },
    {
      key: 'initial_payment',
      done: initialPaymentStatus === 'verified',
      pendingFrom: initialPaymentStatus === 'pending_verification' ? 'admin' : initialPaymentStatus === 'verified' ? 'completed' : 'candidate',
      action: initialPaymentStatus === 'pending_verification' ? 'Verify initial payment' : 'Pay initial payment',
      recommendation: initialPaymentStatus === 'pending_verification' ? 'Verify payment receipt' : 'Wait for candidate payment submission',
    },
    {
      key: 'documents_upload',
      done: docsStatus !== 'not_uploaded',
      pendingFrom: docsStatus === 'not_uploaded' ? 'candidate' : 'completed',
      action: 'Upload required documents',
      recommendation: 'Wait for document uploads',
    },
    {
      key: 'program_payment',
      done: programPaymentStatus === 'verified',
      pendingFrom: programPaymentStatus === 'pending_verification' ? 'admin' : programPaymentStatus === 'verified' ? 'completed' : 'candidate',
      action: programPaymentStatus === 'pending_verification' ? 'Verify program payment' : 'Await program payment instruction email',
      recommendation: programPaymentStatus === 'pending_verification' ? 'Verify payment receipt shared over email' : 'Send payment instruction email to candidate',
    },
    {
      key: 'document_verification',
      done: docsStatus === 'verified',
      pendingFrom: docsStatus === 'verified' ? 'completed' : docsStatus === 'not_uploaded' ? 'candidate' : 'admin',
      action: docsStatus === 'not_uploaded' ? 'Upload documents' : 'Verify uploaded documents',
      recommendation: docsStatus === 'not_uploaded' ? 'Wait for uploads' : 'Review each document and update status',
    },
    {
      key: 'hiring',
      done: stageStatuses.hiring === 'accepted',
      pendingFrom: stageStatuses.hiring === 'accepted' ? 'completed' : 'admin',
      action: 'Assign hiring partner',
      recommendation: 'Assign candidate to hiring partner and confirm',
    },
    {
      key: 'selection',
      done: ['selected', 'rejected'].includes(selectionStatus),
      pendingFrom: ['selected', 'rejected'].includes(selectionStatus) ? 'completed' : 'admin',
      action: 'Publish selection decision',
      recommendation: 'Update candidate selection outcome',
    },
    {
      key: 'final_payment',
      done: finalPaymentStatus === 'verified',
      pendingFrom: finalPaymentStatus === 'pending_verification' ? 'admin' : finalPaymentStatus === 'verified' ? 'completed' : 'candidate',
      action: finalPaymentStatus === 'pending_verification' ? 'Verify final payment' : 'Await final payment instruction email',
      recommendation: finalPaymentStatus === 'pending_verification' ? 'Verify final payment receipt shared over email' : 'Send final payment instruction email to candidate',
    },
    {
      key: 'testimonial',
      done: Boolean(testimonial),
      pendingFrom: testimonial ? 'completed' : 'candidate',
      action: 'Submit testimonial',
      recommendation: 'Request testimonial from candidate',
    },
  ];

  const current = steps.find((step) => !step.done) || { key: 'completed', pendingFrom: 'completed', action: 'No pending action', recommendation: 'No admin action required' };

  return {
    ...base,
    currentStageKey: current.key,
    currentStage: stageLabels[current.key] || current.key,
    nextAction: current.action,
    pendingFrom: current.pendingFrom,
    recommendedAdminAction: current.pendingFrom === 'admin' ? current.recommendation : current.pendingFrom === 'candidate' ? 'Wait for candidate action' : 'No action needed',
  };
};

module.exports = {
  deriveCandidateProgress,
  stageLabels,
};
