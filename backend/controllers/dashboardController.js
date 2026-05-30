const crypto = require('crypto');
const Eligibility = require('../models/Eligibility');
const Profile = require('../models/Profile');
const Payment = require('../models/Payment');
const Document = require('../models/Document');
const Interview = require('../models/Interview');
const Testimonial = require('../models/Testimonial');
const User = require('../models/User');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { deriveCandidateProgress } = require('../utils/candidateProgress');
const sendEmail = require('../utils/sendEmail');
const { generateDeclarationPdf } = require('../utils/declarationPdf');
const { getWorkflowConfig } = require('../utils/workflowEmailer');

const hasPassedInitialEligibility = ({ eligibility, user, profile, payments, docs, interviews }) =>
  Boolean(eligibility) ||
  Boolean(user?.status) ||
  Boolean(profile) ||
  payments.length > 0 ||
  docs.length > 0 ||
  interviews.length > 0;

const hasAdmin1ProgressionApproval = (user) => Boolean(user?.admin1ProgressionApproved);
const documentationUploadOpenStatuses = new Set([
  'onboarding_complete',
  'documents_submitted',
  'documents_received',
  'program_payment_complete',
  'sent_to_partners',
  'interview_completed',
  'selected',
  'process_complete',
]);

const hasDocumentationStageInitiated = (user) =>
  Boolean(user?.documentationStageInitiated) ||
  documentationUploadOpenStatuses.has(String(user?.status || '').toLowerCase());

const buildStages = ({ eligibility, profile, user, docs, interviews, payments, testimonial }) => {
  const hasSubmittedProfile = Boolean(profile) && profile.status !== 'draft';
  const hasInitial = payments.some((p) => p.type === 'initial' && p.status === 'completed');
  const hasProgram = payments.some((p) => p.type === 'program' && p.status === 'completed') || user.status === 'program_payment_complete';
  const hasProgramPending = payments.some((p) => p.type === 'program' && p.status === 'pending');
  const hasProgramFailed = payments.some((p) => p.type === 'program' && p.status === 'failed');
  const hasFinal = payments.some((p) => p.type === 'final' && p.status === 'completed');
  const hasFinalPending = payments.some((p) => p.type === 'final' && p.status === 'pending');
  const hasFinalFailed = payments.some((p) => p.type === 'final' && p.status === 'failed');
  const docsUploaded = docs.length > 0;
  const docsUnderReview = docs.some((d) => d.status === 'Under Review');
  const docsAccepted = docs.length > 0 && docs.every((d) => d.status === 'Accepted');
  const selectionDecision = String(user?.stageStatuses?.get ? user.stageStatuses.get('selection') : user?.stageStatuses?.selection || '').toLowerCase();
  const eligibilityDone = hasPassedInitialEligibility({ eligibility, user, profile, payments, docs, interviews });
  const progressionApproved = hasAdmin1ProgressionApproval(user);
  const documentationStageInitiated = hasDocumentationStageInitiated(user);

  const selected = user.status === 'selected';
  const rejected = user.status === 'rejected' || profile?.status === 'rejected';
  const profileRejected = profile?.status === 'rejected';
  const selectionAccepted = selectionDecision === 'accepted' || (selectionDecision !== 'rejected' && selected);
  const selectionRejected = selectionDecision === 'rejected' || (selectionDecision !== 'accepted' && rejected);
  const selectionUnderReview =
    selectionDecision === 'under_review' ||
    (!selected && !rejected && (user.status === 'sent_to_partners' || user.status === 'interview_completed'));
  const declarationDone =
    user.status === 'declaration_signed' ||
    user.status === 'onboarding_complete' ||
    user.status === 'documents_submitted' ||
    user.status === 'documents_received' ||
    hasProgram ||
    hasFinal ||
    selected ||
    user.status === 'process_complete';
  const onboardingDone =
    user.status === 'onboarding_complete' ||
    user.status === 'documents_submitted' ||
    user.status === 'documents_received' ||
    hasProgram ||
    hasFinal ||
    selected ||
    user.status === 'process_complete';
  const docsReceived =
    user.status === 'documents_received' ||
    (hasProgram && docsAccepted) ||
    hasFinal ||
    selected ||
    user.status === 'process_complete';
  const programFeeActionRequired = docsUploaded && !hasProgram && !hasProgramPending;

  return [
    { name: 'Eligibility Check', status: eligibilityDone ? 'Completed' : 'Pending' },
    { name: 'Account Created', status: user ? 'Completed' : 'Pending' },
    { name: 'Profile Submitted', status: hasSubmittedProfile ? 'Completed' : 'Pending' },
    {
      name: 'Internal Evaluation',
      status: hasSubmittedProfile
        ? profile.status === 'submitted' || profile.status === 'under_review'
          ? 'Under Review'
          : profile.status === 'accepted'
            ? 'Accepted'
            : profile.status === 'rejected'
              ? 'Rejected'
              : 'In Progress'
        : 'Pending',
    },
    { name: 'Initial Payment', status: profileRejected ? 'Inactive' : hasInitial ? 'Completed' : profile?.status === 'accepted' ? (progressionApproved ? 'Pending' : 'Locked') : 'Pending' },
    { name: 'Declaration Signed', status: profileRejected ? 'Inactive' : !progressionApproved ? 'Locked' : declarationDone ? 'Completed' : 'Pending' },
    { name: 'Team Contact / Onboarding', status: profileRejected ? 'Inactive' : !progressionApproved ? 'Locked' : onboardingDone ? 'Completed' : hasInitial ? 'In Progress' : 'Pending' },
    { name: 'Documents Uploaded', status: profileRejected ? 'Inactive' : !progressionApproved ? 'Locked' : !documentationStageInitiated ? 'Locked' : docsUploaded ? 'Completed' : 'Pending' },
    {
      name: 'Program Fee Payment',
      status: profileRejected
        ? 'Inactive'
        : !progressionApproved
          ? 'Locked'
        : hasProgram
        ? 'Completed'
        : hasProgramFailed
          ? 'Rejected'
        : hasProgramPending
          ? 'Under Review'
          : programFeeActionRequired
            ? 'Pending'
            : hasFinal || selected || user.status === 'process_complete'
              ? 'Completed'
              : 'Pending',
    },
    {
      name: 'Document Verification',
      status: profileRejected ? 'Inactive' : !progressionApproved ? 'Locked' : hasProgram ? (docsReceived ? 'Accepted' : docsUnderReview ? 'Under Review' : docsAccepted ? 'In Progress' : 'Pending') : 'Pending',
    },
    {
      name: 'Sent to Hiring Partners',
      status: profileRejected ? 'Inactive' : !progressionApproved ? 'Locked' : user.status === 'sent_to_partners' || selected ? 'Completed' : 'Pending',
    },
    {
      name: 'Selection Result',
      status: profileRejected ? 'Inactive' : !progressionApproved ? 'Locked' : selectionAccepted ? 'Accepted' : selectionRejected ? 'Rejected' : selectionUnderReview ? 'Under Review' : 'Pending',
    },
    {
      name: 'Final Payment',
      status: selectionRejected ? 'Inactive' : !progressionApproved ? 'Locked' : hasFinal ? 'Completed' : hasFinalFailed ? 'Rejected' : hasFinalPending ? 'Under Review' : selectionAccepted ? 'Pending' : 'Pending',
    },
    { name: 'Testimonial', status: selectionRejected ? 'Inactive' : !progressionApproved ? 'Locked' : testimonial ? 'Completed' : 'Pending' },
  ];
};

const deriveNextRoute = ({ eligibility, profile, user, docs, payments }) => {
  const status = String(user?.status || '').toLowerCase();
  const hasInitial = payments.some((p) => p.type === 'initial' && p.status === 'completed');
  const hasProgram = payments.some((p) => p.type === 'program' && p.status === 'completed') || user.status === 'program_payment_complete';
  const hasProgramPending = payments.some((p) => p.type === 'program' && p.status === 'pending');
  const hasProgramFailed = payments.some((p) => p.type === 'program' && p.status === 'failed');
  const hasFinal = payments.some((p) => p.type === 'final' && p.status === 'completed');
  const hasFinalPending = payments.some((p) => p.type === 'final' && p.status === 'pending');
  const hasFinalFailed = payments.some((p) => p.type === 'final' && p.status === 'failed');
  const docsUploaded = docs.length > 0;
  const eligibilityDone = hasPassedInitialEligibility({ eligibility, user, profile, payments, docs, interviews: [] });
  const progressionApproved = hasAdmin1ProgressionApproval(user);
  const documentationStageInitiated = hasDocumentationStageInitiated(user);
  const evaluationApproved = String(user?.evaluationStatus || '').toLowerCase() === 'approved' || status === 'evaluation_approved' || Boolean(user?.admin2EvaluationApproved);
  const operationsApproved = String(user?.operationsStatus || '').toLowerCase() === 'approved' || status === 'fully_approved' || Boolean(user?.admin3EvaluationApproved);
  const accountCreated = ['created', 'email_verified'].includes(String(user?.accountStatus || '').toLowerCase()) || ['account_created', 'email_verified'].includes(status);
  const accountInvited = String(user?.accountStatus || '').toLowerCase() === 'invited' || status === 'account_invited';
  const docsReceived =
    user.status === 'documents_received' ||
    hasFinal ||
    user.status === 'selected' ||
    user.status === 'process_complete';
  const declarationDone =
    user.status === 'declaration_signed' ||
    user.status === 'onboarding_complete' ||
    user.status === 'documents_submitted' ||
    docsReceived;
  const onboardingDone =
    user.status === 'onboarding_complete' ||
    user.status === 'documents_submitted' ||
    docsReceived;

  if (!eligibility || (!eligibility.isEligible && status !== 'eligibility_approved')) return '/eligibility-check';
  if (status === 'eligibility_approved' || status === 'profile_submitted' || status === 'awaiting_evaluation_review') return '/profile-submission';
  if (status === 'evaluation_approved' || status === 'awaiting_operations_approval' || (evaluationApproved && !operationsApproved)) return '/candidate-dashboard';
  if (accountInvited && operationsApproved) return '/signup';
  if (accountCreated && operationsApproved && !user.emailVerified) return '/verify-email';
  if (status === 'email_verified' && !hasInitial) return '/initial-payment';
  if (status === 'onboarding_fee_paid' && !docsUploaded) return '/documents';
  if ((status === 'documents_uploaded' || docsUploaded) && !hasProgram && !hasProgramPending && !hasProgramFailed) return '/payment/program-fee';
  if (status === 'program_fee_requested' && !hasProgramPending && !hasProgram) return '/payment/program-fee';
  if (status === 'program_fee_verified' && !user?.assignedHiringPartner) return '/candidate-dashboard';
  if ((status === 'selected' || user.status === 'selected') && !hasFinal && !hasFinalPending) return '/payment/final-payment';
  if ((status === 'final_payment_requested' || status === 'final_payment_pending') && !hasFinal) return '/payment/final-payment';
  if ((status === 'final_payment_verified' || hasFinal) && !testimonial) return '/testimonial';

  if (!eligibilityDone) return '/eligibility-check';
  if (!profile || profile.status === 'draft') return '/profile-submission';
  if (profile.status === 'submitted' || profile.status === 'under_review') return '/internal-evaluation';
  if (profile.status === 'rejected') return '/candidate-dashboard';
  if (profile.status === 'accepted' && !progressionApproved) return '/candidate-dashboard';
  if (profile.status === 'accepted' && !hasInitial) return '/initial-payment';
  if (hasInitial && !declarationDone) return '/declaration';
  if (hasInitial && declarationDone && !onboardingDone) return '/onboarding';
  if (hasInitial && onboardingDone && !documentationStageInitiated) return '/candidate-dashboard';
  if (hasInitial && onboardingDone && !docsUploaded) return '/documents';
  if (hasInitial && onboardingDone && docsUploaded && !hasProgram && !hasProgramPending) return '/candidate-dashboard';
  if (hasInitial && onboardingDone && docsUploaded && hasProgramFailed) return '/candidate-dashboard';
  if (user.status === 'selected' && !hasFinal && !hasFinalPending) return '/candidate-dashboard';
  if (user.status === 'selected' && hasFinalFailed) return '/candidate-dashboard';

  return '/candidate-dashboard';
};

const getDashboard = async (req, res) => {
  try {
    const [eligibility, profile, payments, docs, interviews, user] = await Promise.all([
      Eligibility.findOne({ userId: req.user._id }).sort({ createdAt: -1 }),
      Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }),
      Payment.find({ userId: req.user._id }),
      Document.find({ userId: req.user._id }),
      Interview.find({ userId: req.user._id }),
      User.findById(req.user._id),
    ]);
    const testimonial = await Testimonial.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

    const stages = buildStages({ eligibility, profile, user, docs, interviews, payments, testimonial });
    const hasProgram = payments.some((p) => p.type === 'program' && p.status === 'completed') || user.status === 'program_payment_complete';
    const hasProgramPending = payments.some((p) => p.type === 'program' && p.status === 'pending');
    const hasProgramFailed = payments.some((p) => p.type === 'program' && p.status === 'failed');
    const effectiveHasProgram = hasProgram;
    const hasFinal = payments.some((p) => p.type === 'final' && p.status === 'completed');
    const hasFinalPending = payments.some((p) => p.type === 'final' && p.status === 'pending');
    const hasFinalFailed = payments.some((p) => p.type === 'final' && p.status === 'failed');
    const hasInitial = payments.some((p) => p.type === 'initial' && p.status === 'completed');
    const docsUploaded = docs.length > 0;
    const eligibilityDone = hasPassedInitialEligibility({ eligibility, user, profile, payments, docs, interviews });
    const docsReceived =
      user.status === 'documents_received' ||
      hasFinal ||
      user.status === 'selected' ||
      user.status === 'process_complete';
    const selectionDecision = String(user?.stageStatuses?.get ? user.stageStatuses.get('selection') : user?.stageStatuses?.selection || '').toLowerCase();
    const declarationDone =
      user.status === 'declaration_signed' ||
      user.status === 'onboarding_complete' ||
      user.status === 'documents_submitted' ||
      docsReceived;
    const onboardingDone =
      user.status === 'onboarding_complete' ||
      user.status === 'documents_submitted' ||
      docsReceived;
    let currentStage = stages.find((s) => s.status === 'Pending' || s.status === 'Under Review' || s.status === 'In Progress');
    if (profile?.status === 'rejected') {
      currentStage = stages.find((s) => s.name === 'Internal Evaluation') || currentStage;
    }
    if ((selectionDecision === 'accepted' || user.status === 'selected' || hasFinal) && !testimonial) {
      currentStage = stages.find((s) => s.name === 'Testimonial') || currentStage;
    } else if (selectionDecision === 'accepted' || user.status === 'selected') {
      currentStage = stages.find((s) => s.name === 'Final Payment' && s.status !== 'Completed') || stages.find((s) => s.name === 'Testimonial') || currentStage;
    } else if (selectionDecision === 'rejected' || user.status === 'not_selected') {
      currentStage = stages.find((s) => s.name === 'Selection Result') || currentStage;
    } else if (!currentStage && (selectionDecision === 'under_review' || user.status === 'sent_to_partners' || user.status === 'interview_completed')) {
      currentStage = stages.find((s) => s.name === 'Selection Result') || currentStage;
    }
    if (!currentStage) {
      currentStage = stages[stages.length - 1];
    }

    const progress = deriveCandidateProgress({ candidate: user, profile, eligibility, documents: docs, interviews, payments, testimonial });
    const nextAction = progress.nextAction || 'No immediate action required';
    const progressionApproved = hasAdmin1ProgressionApproval(user);

    res.json({
      candidate: user,
      contact: {
        email: user?.email || '',
        phone: user?.phone || '',
      },
      eligibility: eligibility
        ? {
            destination: eligibility.destination,
            country: eligibility.country,
            hasITBackground: eligibility.hasITBackground,
            qualification: eligibility.qualification,
            languageAnswer: eligibility.languageAnswer,
            currentLocation: eligibility.currentLocation,
            willingToRelocate: eligibility.willingToRelocate,
            comfortableWithFees: eligibility.comfortableWithFees,
            isEligible: eligibility.isEligible,
            rejectionReason: eligibility.rejectionReason,
          }
        : null,
      profile,
      currentStage: currentStage?.name,
      nextAction,
      nextRoute: deriveNextRoute({ eligibility, profile, user, docs, payments }),
      paymentStatus: payments,
      documentStatus: docs,
      interviewStatus: interviews,
      testimonialSubmitted: Boolean(testimonial),
      stages,
      profileStatus: profile?.status || 'not_submitted',
      progressionApproved,
      progress,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const profile = await Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    const userRecord = await User.findById(req.user._id).lean();
    const progressionApproved = hasAdmin1ProgressionApproval(userRecord);
    if (!progressionApproved && ['declaration_signed', 'onboarding_complete', 'documents_submitted'].includes(String(status || '').toLowerCase())) {
      return res.status(403).json({ message: 'Next-stage updates are locked until Admin 1 progression approval.' });
    }
    if (profile?.status === 'rejected' || ['rejected', 'not_selected'].includes(String(userRecord?.status || '').toLowerCase())) {
      return res.status(403).json({ message: 'This application is not active for further candidate actions.' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { status }, { new: true });

    const normalized = String(status || '').toLowerCase();
    const emailConfigByStatus = {
      declaration_signed: {
        stepKey: 'declaration',
        heading: 'Declaration completed',
        message: 'Your declaration step has been completed successfully.',
      },
      onboarding_complete: {
        stepKey: 'onboarding',
        heading: 'Onboarding completed',
        message: 'Your onboarding update has been recorded successfully.',
      },
      documents_submitted: {
        stepKey: 'documents',
        heading: 'Document submission completed',
        message: 'Your document submission is complete and is now pending further verification by the team.',
      },
    };
    const emailConfig = emailConfigByStatus[normalized];
    if (emailConfig) {
      await sendStepUpdateEmail({
        to: user?.email,
        candidateName: user?.name || user?.email?.split('@')[0],
        stepKey: emailConfig.stepKey,
        heading: emailConfig.heading,
        message: emailConfig.message,
        status: 'completed',
        details: [{ label: 'New Account Status', value: normalized }],
        cta: { label: 'Open Dashboard', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard` },
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const completeDeclarationConsent = async (req, res) => {
  try {
    const {
      agreeChecked,
      readCompleted,
      viewedDocs,
      declarationSignature,
      contractSignature,
      typedLegalName,
      consentTransactionId,
      declarationVersion = 'NST-DEC-2026',
      contractVersion = 'NST-CON-2026',
      pdfReferenceNumber,
    } = req.body || {};

    if (agreeChecked !== true) {
      return res.status(400).json({ message: 'Active "I Agree" confirmation is required.' });
    }
    if (readCompleted !== true || !viewedDocs?.declaration || !viewedDocs?.contract) {
      return res.status(400).json({ message: 'Mandatory read/scroll completion is required before signing.' });
    }
    if (!typedLegalName || String(typedLegalName).trim().length < 3) {
      return res.status(400).json({ message: 'Typed full legal name is required.' });
    }
    if (!declarationSignature?.value || !contractSignature?.value) {
      return res.status(400).json({ message: 'Both declaration and contract signatures are required.' });
    }

    const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ipAddress = forwardedFor || req.ip || req.socket?.remoteAddress || '';
    const signedAt = new Date();
    const consentId = `NST-CONSENT-${crypto.randomUUID()}`;
    const transactionId = String(consentTransactionId || `NST-TXN-${Date.now()}`).trim();
    const pdfReference = String(pdfReferenceNumber || `NST-PDF-${Date.now()}`).trim();
    const retentionYears = Number(process.env.AUDIT_RETENTION_YEARS || 7);
    const retentionUntil = new Date(signedAt);
    retentionUntil.setFullYear(retentionUntil.getFullYear() + Math.max(1, retentionYears));

    const candidate = await User.findById(req.user._id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if (!hasAdmin1ProgressionApproval(candidate)) {
      return res.status(403).json({ message: 'Declaration access is locked until Admin 1 progression approval.' });
    }

    const declarationAudit = {
      consentId,
      transactionId,
      pdfReference,
      signedAt: signedAt.toISOString(),
      ipAddress,
      userAgent: String(req.headers['user-agent'] || ''),
      declarationVersion,
      contractVersion,
      agreeChecked: true,
      readCompleted: true,
      viewedDocs: {
        declaration: true,
        contract: true,
      },
      typedLegalName: String(typedLegalName).trim(),
      signatureMethod: declarationSignature?.type || 'typed',
      declarationSignature,
      contractSignature,
      retentionUntil: retentionUntil.toISOString(),
      auditRetentionPolicy: `Retain until ${retentionUntil.toISOString()}`,
    };

    candidate.declarationConsent = declarationAudit;
    candidate.status = 'declaration_signed';
    await candidate.save();

    const { filePath, fileName, fileUrl } = await generateDeclarationPdf({ candidate, declarationAudit });
    candidate.declarationConsent = {
      ...candidate.declarationConsent,
      pdfFileName: fileName,
      pdfUrl: fileUrl,
    };
    await candidate.save();

    const workflow = getWorkflowConfig();
    await sendEmail({
      to: candidate.email,
      subject: 'NextStep Talent Declaration Copy and Consent Receipt',
      text: [
        'Your declaration and undertaking has been recorded successfully.',
        `Consent ID: ${consentId}`,
        `Transaction ID: ${transactionId}`,
        `PDF Reference: ${pdfReference}`,
        `Signed At: ${signedAt.toISOString()}`,
        `IP Address: ${ipAddress || 'N/A'}`,
      ].join('\n'),
      html: `<p>Your declaration and undertaking has been recorded successfully.</p>
<p><b>Consent ID:</b> ${consentId}<br/>
<b>Transaction ID:</b> ${transactionId}<br/>
<b>PDF Reference:</b> ${pdfReference}<br/>
<b>Signed At:</b> ${signedAt.toISOString()}<br/>
<b>IP Address:</b> ${ipAddress || 'N/A'}</p>`,
      fromEmail: workflow.noreplyFromEmail,
      fromName: 'NextStep Talent',
      attachments: [
        {
          filename: fileName,
          path: filePath,
        },
      ],
    });

    await sendStepUpdateEmail({
      to: candidate?.email,
      candidateName: candidate?.name || candidate?.email?.split('@')[0],
      stepKey: 'declaration',
      heading: 'Declaration completed',
      message: 'Your declaration step has been completed successfully.',
      status: 'completed',
      details: [
        { label: 'Consent ID', value: consentId },
        { label: 'Transaction ID', value: transactionId },
        { label: 'PDF Reference', value: pdfReference },
      ],
      cta: { label: 'Open Dashboard', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard` },
    });

    return res.json({
      message: 'Declaration consent recorded',
      status: candidate.status,
      consentId,
      transactionId,
      pdfReference,
      pdfUrl: fileUrl,
      signedAt: signedAt.toISOString(),
      ipAddress,
      retentionUntil: retentionUntil.toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listCandidates = async (req, res) => {
  try {
    const candidates = await User.find({ role: 'candidate' }).sort({ createdAt: -1 }).lean();
    const candidateIds = candidates.map((c) => c._id);

    const profiles = await Profile.find({ userId: { $in: candidateIds } })
      .sort({ createdAt: -1 })
      .lean();

    const profileByUser = new Map();
    for (const profile of profiles) {
      const key = String(profile.userId || '');
      if (!key || profileByUser.has(key)) continue;
      profileByUser.set(key, profile);
    }

    const response = candidates.map((candidate) => {
      const profile = profileByUser.get(String(candidate._id));
      return {
        ...candidate,
        profileStatus: profile?.status || 'not_submitted',
        profileId: profile?._id || null,
      };
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (['accepted', 'rejected', 'selected', 'not_selected'].includes(normalizedStatus)) {
      return res.status(400).json({
        message: 'Direct approval status changes are disabled. Use the review-based admin approval workflow instead.',
      });
    }
    const candidate = await User.findByIdAndUpdate(req.params.id, { status: normalizedStatus }, { new: true });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (normalizedStatus === 'accepted') {
      await Profile.findOneAndUpdate({ userId: candidate._id }, { status: 'accepted' });
    }
    if (normalizedStatus === 'rejected' || normalizedStatus === 'not_selected') {
      await Profile.findOneAndUpdate({ userId: candidate._id }, { status: 'rejected' });
    }
    if (normalizedStatus === 'selected') {
      candidate.status = 'selected';
      await candidate.save();
    }

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboard, updateMyStatus, completeDeclarationConsent, listCandidates, updateCandidateStatus };
