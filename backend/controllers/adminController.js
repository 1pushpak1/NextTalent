const User = require('../models/User');
const Profile = require('../models/Profile');
const Document = require('../models/Document');
const Interview = require('../models/Interview');
const Payment = require('../models/Payment');
const Eligibility = require('../models/Eligibility');
const Testimonial = require('../models/Testimonial');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');

const validProfileStatuses = ['submitted', 'under_review', 'accepted', 'rejected'];
const validDocumentStatuses = ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'];
const validPaymentTypes = ['initial', 'program', 'final'];
const validPaymentStatuses = ['completed', 'pending', 'failed', 'refunded'];
const validStageDecisionStatuses = ['accepted', 'rejected', 'under_review'];
const validStageKeys = [
  'evaluation',
  'declaration',
  'documents',
  'document-verification',
  'hiring',
  'interviews',
  'selection',
  'testimonials',
];

const stageLabelMap = {
  account_created: 'Account Created',
  profile_submitted: 'Profile Submitted',
  accepted: 'Internal Evaluation',
  rejected: 'Internal Evaluation',
  declaration_signed: 'Declaration & Contract',
  onboarding_complete: 'Declaration & Contract',
  documents_submitted: 'Document Uploads',
  documents_received: 'Document Verification',
  sent_to_partners: 'Hiring Partner Stage',
  interview_scheduled: 'Interviews',
  interview_completed: 'Selection Results',
  selected: 'Selection Results',
  not_selected: 'Selection Results',
  process_complete: 'Testimonials',
};

const stagePageLabelMap = {
  evaluation: 'Internal Evaluation',
  declaration: 'Declaration & Contract',
  documents: 'Document Uploads',
  'document-verification': 'Document Verification',
  hiring: 'Hiring Partner Stage',
  interviews: 'Interviews',
  selection: 'Selection Results',
  testimonials: 'Testimonials',
};

const toId = (value) => String(value || '');

const groupLatestByUserId = (records, userKey = 'userId') => {
  const map = new Map();
  for (const item of records) {
    const key = toId(item[userKey]);
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return map;
};

const groupAllByUserId = (records, userKey = 'userId') => {
  const map = new Map();
  for (const item of records) {
    const key = toId(item[userKey]);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
};

const readStageDecision = (candidate, stageKey) => {
  const source = candidate?.stageStatuses;
  if (!source || !stageKey) return 'pending';
  const rawValue =
    typeof source.get === 'function'
      ? source.get(stageKey)
      : source[stageKey];
  return String(rawValue || 'pending').toLowerCase();
};

const buildCandidateSnapshot = ({ candidate, profile, eligibility, documents, interviews, payments }) => {
  const hasSubmittedProfile = Boolean(profile) && profile.status !== 'draft';
  const paymentByType = {
    initial: payments.find((p) => p.type === 'initial' && p.status === 'completed'),
    program:
      payments.find((p) => p.type === 'program' && p.status === 'completed') ||
      (candidate.status === 'program_payment_complete' ? { type: 'program', status: 'completed' } : null),
    final: payments.find((p) => p.type === 'final' && p.status === 'completed'),
  };

  const hasInitial = Boolean(paymentByType.initial);
  const hasProgram = Boolean(paymentByType.program);
  const hasFinal = Boolean(paymentByType.final);
  const hasInterviews = interviews.length > 0;
  const docsUploaded = documents.length > 0;
  const docsUnderReview = documents.some((d) => d.status === 'Under Review');
  const docsVerified = documents.length > 0 && documents.every((d) => d.status === 'Accepted');
  const docsNeedRevision = documents.some((d) => d.status === 'Needs Revision');

  const declarationDone =
    candidate.status === 'declaration_signed' ||
    candidate.status === 'onboarding_complete' ||
    candidate.status === 'documents_submitted' ||
    candidate.status === 'documents_received' ||
    hasProgram ||
    hasFinal ||
    candidate.status === 'selected' ||
    candidate.status === 'process_complete';

  const eligibilityDone = Boolean(eligibility?.isEligible) || Boolean(profile) || hasInitial || docsUploaded || hasInterviews;

  const currentStage =
    stageLabelMap[candidate.status] ||
    (hasSubmittedProfile
      ? profile.status === 'submitted' || profile.status === 'under_review'
        ? 'Internal Evaluation'
        : profile.status === 'accepted'
          ? 'Initial Payment'
          : profile.status === 'rejected'
            ? 'Internal Evaluation'
            : 'Profile Submitted'
      : 'Eligibility Applications');

  return {
    candidate,
    profile,
    eligibility,
    documents,
    interviews,
    payments,
    hasInitial,
    hasProgram,
    hasFinal,
    hasInterviews,
    docsUploaded,
    docsUnderReview,
    docsVerified,
    docsNeedRevision,
    declarationDone,
    eligibilityDone,
    currentStage,
  };
};

const deriveAdminStageKey = (snapshot) => {
  const { candidate, profile, hasInitial, hasProgram, hasFinal, docsUploaded, hasInterviews } = snapshot;
  const status = String(candidate?.status || '');
  const evaluationDecision = readStageDecision(candidate, 'evaluation');
  const declarationDecision = readStageDecision(candidate, 'declaration');
  const documentVerificationDecision = readStageDecision(candidate, 'document-verification');
  const hiringDecision = readStageDecision(candidate, 'hiring');
  const interviewDecision = readStageDecision(candidate, 'interviews');

  if (status === 'process_complete') return 'testimonials';
  if (status === 'selected' && hasFinal) return 'testimonials';
  if (['not_selected', 'rejected'].includes(status)) return 'selection';
  if (status === 'selected') return 'selection';
  if (status === 'interview_completed' || interviewDecision === 'accepted') return 'selection';
  if (hasInterviews || status === 'interview_scheduled' || status === 'sent_to_partners') return 'interviews';
  if (!profile || profile.status === 'draft') return null;

  if (!hasInitial) return 'evaluation';
  if (evaluationDecision !== 'accepted') return 'evaluation';

  if (hasInitial && !docsUploaded) {
    const declarationCompletedByCandidate = ['declaration_signed', 'onboarding_complete', 'documents_submitted'].includes(status);
    if (!declarationCompletedByCandidate || declarationDecision !== 'accepted') {
      return 'declaration';
    }
    return 'documents';
  }

  if (docsUploaded && !hasProgram) return null;
  if (docsUploaded && hasProgram && documentVerificationDecision !== 'accepted') return 'document-verification';
  if (docsUploaded && hasProgram && documentVerificationDecision === 'accepted' && hiringDecision !== 'accepted') return 'hiring';

  return null;
};

const stageMatcher = (stageKey, snapshot) => {
  const derivedStage = deriveAdminStageKey(snapshot);

  switch (stageKey) {
    case 'dashboard':
      return true;
    case 'evaluation':
      return derivedStage === 'evaluation';
    case 'declaration':
      return derivedStage === 'declaration';
    case 'documents':
      return derivedStage === 'documents';
    case 'document-verification':
      return derivedStage === 'document-verification';
    case 'hiring':
      return derivedStage === 'hiring';
    case 'interviews':
      return derivedStage === 'interviews';
    case 'selection':
      return derivedStage === 'selection';
    case 'testimonials':
      return derivedStage === 'testimonials';
    default:
      return true;
  }
};

const passedStageMatcher = (stageKey, snapshot) => {
  if (!stageKey || stageKey === 'dashboard') return false;
  return readStageDecision(snapshot.candidate, stageKey) === 'accepted';
};

const formatCandidateRow = (snapshot, stageKey = '') => {
  const { candidate, profile, currentStage, interviews, testimonial } = snapshot;
  const normalizedStageKey = String(stageKey || '').toLowerCase();
  const stepStatus =
    normalizedStageKey && candidate?.stageStatuses
      ? candidate.stageStatuses[normalizedStageKey] || 'pending'
      : 'pending';
  const latestInterview = interviews[0] || null;
  const displayName = profile?.personalDetails?.firstName || candidate.name || candidate.email?.split('@')?.[0] || 'N/A';
  return {
    _id: candidate._id,
    name: displayName,
    email: candidate.email,
    country: profile?.personalDetails?.currentCountryOfResidence || 'N/A',
    currentStage: stagePageLabelMap[normalizedStageKey] || currentStage,
    status: candidate.status || 'N/A',
    date: candidate.createdAt,
    profileStatus: profile?.status || 'not_submitted',
    stepStatus,
    assignedHiringPartner: candidate.assignedHiringPartner || '',
    latestInterviewStatus: latestInterview?.status || '',
    latestInterviewRole: latestInterview?.role || '',
    testimonialText: testimonial?.text || '',
  };
};

const fetchAllSnapshots = async () => {
  const candidates = await User.find({ role: 'candidate' }).sort({ createdAt: -1 }).lean();
  const candidateIds = candidates.map((c) => c._id);

  const [profiles, eligibilities, documents, interviews, payments, testimonials] = await Promise.all([
    Profile.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Eligibility.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Document.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Interview.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Payment.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Testimonial.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
  ]);

  const profileByUser = groupLatestByUserId(profiles);
  const eligibilityByUser = groupLatestByUserId(eligibilities);
  const documentsByUser = groupAllByUserId(documents);
  const interviewsByUser = groupAllByUserId(interviews);
  const paymentsByUser = groupAllByUserId(payments);
  const testimonialByUser = groupLatestByUserId(testimonials);

  return candidates.map((candidate) => {
    const userId = toId(candidate._id);
    const snapshot = buildCandidateSnapshot({
      candidate,
      profile: profileByUser.get(userId) || null,
      eligibility: eligibilityByUser.get(userId) || null,
      documents: documentsByUser.get(userId) || [],
      interviews: interviewsByUser.get(userId) || [],
      payments: paymentsByUser.get(userId) || [],
    });
    snapshot.testimonial = testimonialByUser.get(userId) || null;
    return snapshot;
  });
};

const listCandidatesByStage = async (req, res) => {
  try {
    const stageKey = String(req.params.stageKey || 'dashboard').toLowerCase();
    const filter = String(req.query.filter || 'current').toLowerCase();
    const snapshots = await fetchAllSnapshots();

    const filteredSnapshots =
      filter === 'passed'
        ? snapshots.filter((snapshot) => passedStageMatcher(stageKey, snapshot))
        : snapshots.filter((snapshot) => stageMatcher(stageKey, snapshot));

    const rows = filteredSnapshots.map((snapshot) => formatCandidateRow(snapshot, stageKey));

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const snapshots = await fetchAllSnapshots();

    const totalApplications = snapshots.length;
    const pendingEvaluation = snapshots.filter((s) => s.profile && ['submitted', 'under_review'].includes(s.profile.status)).length;
    const documentsPendingReview = snapshots.filter((s) => s.docsUploaded && !s.docsVerified).length;
    const interviewsScheduled = snapshots.filter((s) => s.hasInterviews).length;
    const selectedCandidates = snapshots.filter((s) => s.candidate.status === 'selected').length;
    const totalRevenue = snapshots.reduce((sum, s) => {
      const paid = s.payments.filter((p) => p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0);
      return sum + paid;
    }, 0);

    const recentApplications = snapshots
      .map((s) => formatCandidateRow(s))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    const recentPayments = snapshots
      .flatMap((s) => s.payments.map((p) => ({
        _id: p._id,
        candidateId: s.candidate._id,
        candidateName: s.candidate.name,
        candidateEmail: s.candidate.email,
        type: p.type,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        transactionId: p.transactionId,
        date: p.createdAt,
      })))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    res.json({
      cards: {
        totalApplications,
        pendingEvaluation,
        documentsPendingReview,
        interviewsScheduled,
        selectedCandidates,
        totalRevenue,
      },
      recentApplications,
      recentPayments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPaymentsOverview = async (req, res) => {
  try {
    const payments = await Payment.find({}).sort({ createdAt: -1 }).lean();

    const totals = {
      collected: 0,
      initial: 0,
      program: 0,
      final: 0,
      counts: {
        initial: 0,
        program: 0,
        final: 0,
      },
    };

    for (const payment of payments) {
      if (payment.status !== 'completed') continue;
      totals.collected += payment.amount || 0;
      if (validPaymentTypes.includes(payment.type)) {
        totals[payment.type] += payment.amount || 0;
        totals.counts[payment.type] += 1;
      }
    }

    res.json(totals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const paymentStageMatcher = (type, snapshot) => {
  if (type === 'initial') return true;
  if (type === 'program') return snapshot.hasInitial || snapshot.hasProgram || snapshot.candidate.status === 'documents_received';
  if (type === 'final') return snapshot.candidate.status === 'selected' || snapshot.hasFinal;
  return false;
};

const paymentExpectedAmount = {
  initial: 500,
  program: 3500,
  final: 4000,
};

const paymentStatusLabel = (rawStatus = '') => {
  const normalized = String(rawStatus || '').toLowerCase();
  if (normalized === 'completed') return 'Received';
  if (normalized === 'failed') return 'Not Received';
  if (normalized === 'pending') return 'Pending Verification';
  if (normalized === 'refunded') return 'Refunded';
  return 'Pending';
};

const listPaymentsByType = async (req, res) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    if (!validPaymentTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid payment type' });
    }

    const snapshots = await fetchAllSnapshots();
    const rows = snapshots
      .filter((snapshot) => paymentStageMatcher(type, snapshot))
      .map((snapshot) => {
        const latest = snapshot.payments.find((p) => p.type === type) || null;
        const paid = Boolean(latest && latest.status === 'completed');
        return {
          candidateId: snapshot.candidate._id,
          candidateName: snapshot.candidate.name,
          email: snapshot.candidate.email,
          paymentId: latest?._id || null,
          paymentType: type,
          amount: latest?.amount ?? paymentExpectedAmount[type],
          status: latest ? paymentStatusLabel(latest.status) : 'Pending',
          rawStatus: latest?.status || 'pending',
          date: latest?.createdAt || null,
          transactionId: latest?.transactionId || '—',
          method: latest?.method || '—',
          receiptUrl: latest?.receiptUrl || '',
          bankReference: latest?.bankReference || '',
        };
      });

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCandidateDetails = async (req, res) => {
  try {
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' }).select('-passwordHash').lean();
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const [profile, documents, interviews, payments, eligibility, testimonial] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({
      candidate,
      profile,
      documents,
      interviews,
      payments,
      eligibility,
      testimonial,
      adminNotes: candidate.adminNotes || '',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateProfileStatus = async (req, res) => {
  try {
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!validProfileStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid profile status' });
    }

    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const profile = await Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found for this candidate' });
    }

    profile.status = status;
    await profile.save();

    if (status === 'accepted') {
      candidate.status = 'accepted';
      await candidate.save();
    }
    if (status === 'rejected') {
      candidate.status = 'rejected';
      await candidate.save();
    }

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: 'evaluation',
      heading: 'Profile review status updated',
      message: 'Your profile review status has been updated by admin.',
      status,
      details: [{ label: 'Profile Status', value: status }],
      cta: { label: 'View Dashboard', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard` },
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateDocumentStatus = async (req, res) => {
  try {
    const status = String(req.body?.status || '').trim();
    if (!validDocumentStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid document status' });
    }

    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const document = await Document.findOne({ _id: req.params.documentId, userId: candidate._id });
    if (!document) return res.status(404).json({ message: 'Document not found for this candidate' });

    document.status = status;
    await document.save();

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: 'document_verification',
      heading: 'Document verification update',
      message: 'A document status has been updated by admin.',
      status: String(status || '').toLowerCase().replaceAll(' ', '_'),
      details: [
        { label: 'Document Type', value: document.documentType || 'Document' },
        { label: 'Status', value: status },
      ],
      cta: { label: 'Open Documents', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/documents` },
    });

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addCandidateInterview = async (req, res) => {
  try {
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const { hiringPartner, country, role, date, time, meetingLink } = req.body || {};
    if (!hiringPartner || !country || !role || !date || !time) {
      return res.status(400).json({ message: 'hiringPartner, country, role, date and time are required' });
    }

    const interview = await Interview.create({
      userId: candidate._id,
      hiringPartner,
      country,
      role,
      date,
      time,
      meetingLink: meetingLink || '',
      status: 'Scheduled',
    });

    if (!candidate.stageStatuses) {
      candidate.stageStatuses = new Map();
    }
    candidate.stageStatuses.set('interviews', 'under_review');
    candidate.status = 'interview_scheduled';
    await candidate.save();

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: 'interviews',
      heading: 'Interview scheduled',
      message: 'Your interview details are now available.',
      status: 'under_review',
      details: [
        { label: 'Hiring Partner', value: hiringPartner },
        { label: 'Role', value: role },
        { label: 'Date', value: date },
        { label: 'Time', value: time },
      ],
      cta: { label: 'View Interviews', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/interviews` },
    });

    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!validPaymentStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const payment = await Payment.findByIdAndUpdate(paymentId, { status }, { new: true });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const candidate = await User.findById(payment.userId);

    if (status === 'completed') {
      if (payment.type === 'program') {
        await User.findByIdAndUpdate(payment.userId, { status: 'program_payment_complete' });
      }
      if (payment.type === 'final') {
        await User.findByIdAndUpdate(payment.userId, { status: 'final_payment_complete' });
      }
    }

    await sendStepUpdateEmail({
      to: candidate?.email,
      candidateName: candidate?.name || candidate?.email?.split('@')[0],
      stepKey: payment.type === 'initial' ? 'initial_payment' : payment.type === 'program' ? 'program_payment' : 'final_payment',
      heading: 'Payment verification updated by admin',
      message: 'Your payment verification status has been updated.',
      status,
      details: [
        { label: 'Payment Type', value: payment.type },
        { label: 'Amount', value: `${payment.currency || 'USD'} ${payment.amount || 0}` },
        { label: 'Transaction ID', value: payment.transactionId || '—' },
      ],
      cta: { label: 'Open Payment History', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/payment-history` },
    });

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateNotes = async (req, res) => {
  try {
    const notes = String(req.body?.notes || '').trim();
    const candidate = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'candidate' },
      { adminNotes: notes },
      { new: true }
    ).select('-passwordHash');

    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    res.json({ adminNotes: candidate.adminNotes || '' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateStageDecision = async (req, res) => {
  try {
    const stageKey = String(req.params?.stageKey || '').trim().toLowerCase();
    const status = String(req.body?.status || '').trim().toLowerCase();
    const hiringPartner = String(req.body?.hiringPartner || '').trim();

    if (!validStageKeys.includes(stageKey)) {
      return res.status(400).json({ message: `Invalid stage key: ${stageKey}` });
    }
    if (!validStageDecisionStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid stage status' });
    }

    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (!candidate.stageStatuses) {
      candidate.stageStatuses = new Map();
    }
    candidate.stageStatuses.set(stageKey, status);

    if (stageKey === 'evaluation') {
      const profile = await Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 });
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found for this candidate' });
      }

      if (status === 'accepted') {
        profile.status = 'accepted';
        candidate.status = 'accepted';
      } else if (status === 'rejected') {
        profile.status = 'rejected';
        candidate.status = 'rejected';
      } else if (status === 'under_review') {
        profile.status = 'under_review';
        candidate.status = 'profile_submitted';
      }
      await profile.save();
    }

    if (stageKey === 'document-verification') {
      if (status === 'accepted') {
        candidate.status = 'documents_received';
      } else if (status === 'under_review') {
        candidate.status = 'documents_submitted';
      }
    }

    if (stageKey === 'hiring') {
      if (status === 'accepted') {
        if (!hiringPartner) {
          return res.status(400).json({ message: 'Hiring partner is required' });
        }
        candidate.assignedHiringPartner = hiringPartner;
        candidate.status = 'sent_to_partners';
      } else if (status === 'under_review') {
        candidate.assignedHiringPartner = '';
      }
    }

    if (stageKey === 'interviews') {
      const interview = await Interview.findOne({ userId: candidate._id }).sort({ createdAt: -1 });
      if (!interview) {
        return res.status(404).json({ message: 'No interview found for this candidate' });
      }

      if (status === 'accepted') {
        interview.status = 'Completed';
        candidate.status = 'interview_completed';
      } else if (status === 'under_review') {
        interview.status = 'Scheduled';
        candidate.status = 'interview_scheduled';
      }
      await interview.save();
    }

    if (stageKey === 'selection') {
      if (status === 'accepted') {
        candidate.status = 'selected';
      } else if (status === 'rejected') {
        candidate.status = 'not_selected';
      }
    }

    if (stageKey === 'testimonials' && status === 'accepted') {
      candidate.status = 'process_complete';
    }

    await candidate.save();

    const stageToEmailStep = {
      evaluation: 'evaluation',
      declaration: 'declaration',
      documents: 'documents',
      'document-verification': 'document_verification',
      hiring: 'hiring',
      interviews: 'interviews',
      selection: 'selection',
      testimonials: 'testimonial',
    };

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: stageToEmailStep[stageKey] || 'profile',
      stepName: stagePageLabelMap[stageKey] || stageKey,
      heading: 'Stage decision updated by admin',
      message: 'A stage decision has been updated in your process.',
      status,
      details: [
        { label: 'Stage', value: stagePageLabelMap[stageKey] || stageKey },
        { label: 'Decision', value: status },
        ...(hiringPartner ? [{ label: 'Hiring Partner', value: hiringPartner }] : []),
      ],
      cta: { label: 'Open Dashboard', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard` },
    });

    return res.json({
      candidateId: candidate._id,
      stageKey,
      status,
      stageStatuses: candidate.stageStatuses,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listCandidatesByStage,
  getDashboardSummary,
  getPaymentsOverview,
  listPaymentsByType,
  getCandidateDetails,
  updateCandidateProfileStatus,
  updateCandidateDocumentStatus,
  addCandidateInterview,
  updatePaymentStatus,
  updateCandidateNotes,
  updateCandidateStageDecision,
};
