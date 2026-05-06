const Eligibility = require('../models/Eligibility');
const Profile = require('../models/Profile');
const Payment = require('../models/Payment');
const Document = require('../models/Document');
const Interview = require('../models/Interview');
const Testimonial = require('../models/Testimonial');
const User = require('../models/User');

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
  const anyInterview = interviews.length > 0;
  const hasScheduledInterview =
    interviews.some((interview) => String(interview.status || '').toLowerCase() === 'scheduled') ||
    user.status === 'interview_scheduled';
  const hasCompletedInterview =
    interviews.some((interview) => String(interview.status || '').toLowerCase() === 'completed') ||
    user.status === 'interview_completed';
  const selectionDecision = String(user?.stageStatuses?.get ? user.stageStatuses.get('selection') : user?.stageStatuses?.selection || '').toLowerCase();
  const eligibilityDone = hasPassedInitialEligibility({ eligibility, user, profile, payments, docs, interviews });

  const selected = user.status === 'selected';
  const rejected = user.status === 'rejected' || profile?.status === 'rejected';
  const selectionAccepted = selectionDecision === 'accepted' || (selectionDecision !== 'rejected' && selected);
  const selectionRejected = selectionDecision === 'rejected' || (selectionDecision !== 'accepted' && rejected);
  const selectionUnderReview = selectionDecision === 'under_review' || (!selected && !rejected && user.status === 'interview_completed');
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
    { name: 'Initial Payment', status: hasInitial ? 'Completed' : profile?.status === 'accepted' ? 'Pending' : 'Pending' },
    { name: 'Declaration Signed', status: declarationDone ? 'Completed' : 'Pending' },
    { name: 'Team Contact / Onboarding', status: onboardingDone ? 'Completed' : hasInitial ? 'In Progress' : 'Pending' },
    { name: 'Documents Uploaded', status: docsUploaded ? 'Completed' : 'Pending' },
    {
      name: 'Program Fee Payment',
      status: hasProgram
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
      status: hasProgram ? (docsReceived ? 'Accepted' : docsUnderReview ? 'Under Review' : docsAccepted ? 'In Progress' : 'Pending') : 'Pending',
    },
    {
      name: 'Sent to Hiring Partners',
      status: user.status === 'sent_to_partners' || anyInterview || selected ? 'Completed' : 'Pending',
    },
    {
      name: 'Interviews',
      status: hasCompletedInterview ? 'Completed' : hasScheduledInterview ? 'In Progress' : anyInterview ? 'Pending' : 'Pending',
    },
    {
      name: 'Selection Result',
      status: selectionAccepted ? 'Accepted' : selectionRejected ? 'Rejected' : selectionUnderReview ? 'Under Review' : 'Pending',
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
  if (profile.status === 'rejected') return '/email-sent';
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
    if ((selectionDecision === 'accepted' || user.status === 'selected' || hasFinal) && !testimonial) {
      currentStage = stages.find((s) => s.name === 'Testimonial') || currentStage;
    } else if (selectionDecision === 'accepted' || user.status === 'selected') {
      currentStage = stages.find((s) => s.name === 'Final Payment' && s.status !== 'Completed') || stages.find((s) => s.name === 'Testimonial') || currentStage;
    } else if (selectionDecision === 'rejected' || user.status === 'not_selected') {
      currentStage = stages.find((s) => s.name === 'Selection Result') || currentStage;
    } else if (!currentStage && (selectionDecision === 'under_review' || user.status === 'interview_completed' || user.status === 'interview_scheduled')) {
      currentStage = stages.find((s) => s.name === 'Selection Result') || currentStage;
    }
    if (!currentStage) {
      currentStage = stages[stages.length - 1];
    }

    let nextAction = 'No immediate action required';
    if (!eligibilityDone) nextAction = 'Complete eligibility check';
    else if (!profile || profile.status === 'draft') nextAction = 'Complete and submit your saved profile';
    else if (profile.status === 'submitted' || profile.status === 'under_review') nextAction = 'Await internal evaluation outcome';
    else if (profile.status === 'rejected') nextAction = 'Review profile not accepted notification';
    else if (profile.status === 'accepted' && !hasInitial) nextAction = 'Complete initial payment (USD 500)';
    else if (hasInitial && !declarationDone) nextAction = 'Sign declaration and contract';
    else if (hasInitial && declarationDone && !onboardingDone) nextAction = 'Complete team contact/onboarding';
    else if (hasInitial && onboardingDone && !docsUploaded) nextAction = 'Upload required documents';
    else if (docsUploaded && hasProgramFailed)
      nextAction = 'Payment not received. Please upload the correct receipt file or contact support to resolve this issue.';
    else if (docsUploaded && hasProgramPending)
      nextAction = 'Waiting for payment confirmation';
    else if (docsUploaded && !effectiveHasProgram)
      nextAction = 'Pay program fee (USD 3,500) and upload transfer receipt';
    else if (effectiveHasProgram && !docsReceived) nextAction = 'Await document verification';
    else if (user.status === 'selected' && hasFinalFailed)
      nextAction = 'Payment not received. Please upload the correct receipt file or contact support to resolve this issue.';
    else if (user.status === 'selected' && hasFinalPending)
      nextAction = 'Final payment under verification';
    else if (user.status === 'selected' && !hasFinal)
      nextAction = 'Complete final payment';
    else if (hasFinal && !testimonial)
      nextAction = 'Share your testimonial';

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
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { status }, { new: true });
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
