const Eligibility = require('../models/Eligibility');
const Profile = require('../models/Profile');
const Payment = require('../models/Payment');
const Document = require('../models/Document');
const Interview = require('../models/Interview');
const Testimonial = require('../models/Testimonial');
const User = require('../models/User');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { deriveCandidateProgress } = require('../utils/candidateProgress');

const hasPassedInitialEligibility = ({ eligibility, user, profile, payments, docs, interviews }) =>
  Boolean(eligibility) ||
  Boolean(user?.status) ||
  Boolean(profile) ||
  payments.length > 0 ||
  docs.length > 0 ||
  interviews.length > 0;

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
    { name: 'Initial Payment', status: profileRejected ? 'Inactive' : hasInitial ? 'Completed' : profile?.status === 'accepted' ? 'Pending' : 'Pending' },
    { name: 'Declaration Signed', status: profileRejected ? 'Inactive' : declarationDone ? 'Completed' : 'Pending' },
    { name: 'Team Contact / Onboarding', status: profileRejected ? 'Inactive' : onboardingDone ? 'Completed' : hasInitial ? 'In Progress' : 'Pending' },
    { name: 'Documents Uploaded', status: profileRejected ? 'Inactive' : docsUploaded ? 'Completed' : 'Pending' },
    {
      name: 'Program Fee Payment',
      status: profileRejected
        ? 'Inactive'
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
      status: profileRejected ? 'Inactive' : hasProgram ? (docsReceived ? 'Accepted' : docsUnderReview ? 'Under Review' : docsAccepted ? 'In Progress' : 'Pending') : 'Pending',
    },
    {
      name: 'Sent to Hiring Partners',
      status: profileRejected ? 'Inactive' : user.status === 'sent_to_partners' || selected ? 'Completed' : 'Pending',
    },
    {
      name: 'Selection Result',
      status: profileRejected ? 'Inactive' : selectionAccepted ? 'Accepted' : selectionRejected ? 'Rejected' : selectionUnderReview ? 'Under Review' : 'Pending',
    },
    {
      name: 'Final Payment',
      status: selectionRejected ? 'Inactive' : hasFinal ? 'Completed' : hasFinalFailed ? 'Rejected' : hasFinalPending ? 'Under Review' : selectionAccepted ? 'Pending' : 'Pending',
    },
    { name: 'Testimonial', status: selectionRejected ? 'Inactive' : testimonial ? 'Completed' : 'Pending' },
  ];
};

const deriveNextRoute = ({ eligibility, profile, user, docs, payments }) => {
  const hasInitial = payments.some((p) => p.type === 'initial' && p.status === 'completed');
  const hasProgram = payments.some((p) => p.type === 'program' && p.status === 'completed') || user.status === 'program_payment_complete';
  const hasProgramPending = payments.some((p) => p.type === 'program' && p.status === 'pending');
  const hasProgramFailed = payments.some((p) => p.type === 'program' && p.status === 'failed');
  const hasFinal = payments.some((p) => p.type === 'final' && p.status === 'completed');
  const hasFinalPending = payments.some((p) => p.type === 'final' && p.status === 'pending');
  const hasFinalFailed = payments.some((p) => p.type === 'final' && p.status === 'failed');
  const docsUploaded = docs.length > 0;
  const eligibilityDone = hasPassedInitialEligibility({ eligibility, user, profile, payments, docs, interviews: [] });
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

  if (!eligibilityDone) return '/eligibility-check';
  if (!profile || profile.status === 'draft') return '/profile-submission';
  if (profile.status === 'submitted' || profile.status === 'under_review') return '/internal-evaluation';
  if (profile.status === 'rejected') return '/candidate-dashboard';
  if (profile.status === 'accepted' && !hasInitial) return '/initial-payment';
  if (hasInitial && !declarationDone) return '/declaration';
  if (hasInitial && declarationDone && !onboardingDone) return '/onboarding';
  if (hasInitial && onboardingDone && !docsUploaded) return '/documents';
  if (hasInitial && onboardingDone && docsUploaded && !hasProgram && !hasProgramPending) return '/payment/program-fee';
  if (hasInitial && onboardingDone && docsUploaded && hasProgramFailed) return '/payment/program-fee';
  if (user.status === 'selected' && !hasFinal && !hasFinalPending) return '/payment/final-payment';
  if (user.status === 'selected' && hasFinalFailed) return '/payment/final-payment';

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

module.exports = { getDashboard, updateMyStatus, listCandidates, updateCandidateStatus };
