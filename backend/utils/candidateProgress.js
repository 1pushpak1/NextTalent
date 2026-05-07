const stageLabels = {
  eligibility: 'Eligibility Applications',
  account: 'Account Created',
  profile_submitted: 'Profile Submitted',
  profile_review: 'Profile Review',
  initial_payment: 'Initial Payment',
  declaration: 'Declaration & Contract',
  documents_upload: 'Document Uploads',
  program_payment: 'Program Payment',
  document_verification: 'Document Verification',
  hiring: 'Hiring Partner Stage',
  interviews: 'Interviews',
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

const paymentStatusLabel = (payment, paymentType) => {
  const target = payment.find((p) => p.type === paymentType);
  if (!target) return 'not_started';
  const status = String(target.status || '').toLowerCase();
  if (status === 'completed') return 'verified';
  if (status === 'pending') return 'pending_verification';
  if (status === 'failed') return 'failed';
  if (status === 'refunded') return 'refunded';
  return status || 'unknown';
};

const deriveCandidateProgress = ({ candidate, profile, eligibility, documents = [], interviews = [], payments = [], testimonial }) => {
  const profileStatus = profile?.status || 'not_submitted';
  const eligibilityStatus = eligibility?.isEligible === true ? 'eligible' : eligibility ? 'not_eligible' : 'not_started';
  const emailPhoneVerified = Boolean(candidate?.emailVerified) && Boolean(candidate?.phoneVerified);

  const docsStatus =
    !documents.length ? 'not_uploaded' :
      documents.some((d) => d.status === 'Needs Revision') ? 'needs_revision' :
        documents.every((d) => d.status === 'Accepted') ? 'verified' :
          documents.some((d) => d.status === 'Under Review') ? 'under_review' : 'uploaded';

  const initialPaymentStatus = paymentStatusLabel(payments, 'initial');
  const programPaymentStatus = paymentStatusLabel(payments, 'program');
  const finalPaymentStatus = paymentStatusLabel(payments, 'final');

  const stageStatuses = {
    evaluation: String(toMapValue(candidate?.stageStatuses, 'evaluation') || '').toLowerCase(),
    declaration: String(toMapValue(candidate?.stageStatuses, 'declaration') || '').toLowerCase(),
    documentVerification: String(toMapValue(candidate?.stageStatuses, 'document-verification') || '').toLowerCase(),
    hiring: String(toMapValue(candidate?.stageStatuses, 'hiring') || '').toLowerCase(),
    interviews: String(toMapValue(candidate?.stageStatuses, 'interviews') || '').toLowerCase(),
    selection: String(toMapValue(candidate?.stageStatuses, 'selection') || '').toLowerCase(),
  };

  const latestInterview = interviews[0] || null;
  const interviewStatus = latestInterview ? String(latestInterview.status || '').toLowerCase() : 'not_scheduled';
  const selectionStatus =
    stageStatuses.selection === 'accepted' || candidate?.status === 'selected' ? 'selected' :
      stageStatuses.selection === 'rejected' || candidate?.status === 'not_selected' || candidate?.status === 'rejected' ? 'rejected' :
        interviewStatus === 'completed' || candidate?.status === 'interview_completed' ? 'under_review' : 'pending';

  const steps = [
    {
      key: 'eligibility',
      done: eligibilityStatus === 'eligible',
      pendingFrom: eligibilityStatus === 'eligible' ? 'completed' : 'candidate',
      action: 'Complete eligibility check',
      recommendation: 'Wait for candidate to submit eligibility form',
    },
    {
      key: 'account',
      done: emailPhoneVerified,
      pendingFrom: emailPhoneVerified ? 'completed' : 'candidate',
      action: 'Verify email and phone',
      recommendation: 'Wait for candidate verification',
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
      action: programPaymentStatus === 'pending_verification' ? 'Verify program payment' : 'Pay program fee',
      recommendation: programPaymentStatus === 'pending_verification' ? 'Verify receipt and bank reference' : 'Wait for candidate payment submission',
    },
    {
      key: 'document_verification',
      done: docsStatus === 'verified',
      pendingFrom: docsStatus === 'verified' ? 'completed' : docsStatus === 'not_uploaded' ? 'candidate' : 'admin',
      action: docsStatus === 'not_uploaded' ? 'Upload documents' : 'Verify uploaded documents',
      recommendation: docsStatus === 'not_uploaded' ? 'Wait for uploads' : 'Review each document and update status',
    },
    {
      key: 'interviews',
      done: ['completed'].includes(interviewStatus),
      pendingFrom: interviewStatus === 'completed' ? 'completed' : interviewStatus === 'scheduled' ? 'admin' : 'admin',
      action: interviewStatus === 'scheduled' ? 'Complete scheduled interview' : 'Schedule interview',
      recommendation: 'Coordinate with hiring partner and update interview status',
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
      action: finalPaymentStatus === 'pending_verification' ? 'Verify final payment' : 'Pay final amount',
      recommendation: finalPaymentStatus === 'pending_verification' ? 'Verify final payment receipt' : 'Wait for candidate final payment',
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
    currentStageKey: current.key,
    currentStage: stageLabels[current.key] || current.key,
    nextAction: current.action,
    pendingFrom: current.pendingFrom,
    recommendedAdminAction: current.pendingFrom === 'admin' ? current.recommendation : current.pendingFrom === 'candidate' ? 'Wait for candidate action' : 'No action needed',
    profileStatus,
    evaluationStatus: profileStatus,
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
      emailVerified: Boolean(candidate?.emailVerified),
      phoneVerified: Boolean(candidate?.phoneVerified),
    },
  };
};

module.exports = {
  deriveCandidateProgress,
  stageLabels,
};
