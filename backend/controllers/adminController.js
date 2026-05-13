const User = require('../models/User');
const Profile = require('../models/Profile');
const Document = require('../models/Document');
const Interview = require('../models/Interview');
const Payment = require('../models/Payment');
const Eligibility = require('../models/Eligibility');
const Testimonial = require('../models/Testimonial');
const ApprovalAuditLog = require('../models/ApprovalAuditLog');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { deriveCandidateProgress } = require('../utils/candidateProgress');
const {
  sanitizeReasonNote,
  createApprovalAuditLog,
  filterAuditEntriesForAdmin,
} = require('../utils/approvalAudit');
const { getProgramFeeBreakdown } = require('../utils/programFee');
const { getWorkflowConfig, sendAdminNotification, normalizeEmail } = require('../utils/workflowEmailer');

const validProfileStatuses = ['submitted', 'under_review', 'accepted', 'rejected'];
const validDocumentStatuses = ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'];
const validPaymentTypes = ['initial', 'program', 'final'];
const validPaymentStatuses = ['completed', 'pending', 'failed', 'refunded'];
const validStageDecisionStatuses = ['accepted', 'rejected', 'under_review'];
const validStageKeys = [
  'evaluation',
  'declaration',
  'documents',
  'background-verification',
  'document-verification',
  'hiring',
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
  interview_completed: 'Selection Results',
  selected: 'Selection Results',
  not_selected: 'Selection Results',
  process_complete: 'Testimonials',
};

const stagePageLabelMap = {
  evaluation: 'Internal Evaluation',
  declaration: 'Declaration & Contract',
  documents: 'Document Uploads',
  'background-verification': 'Background Verification',
  'document-verification': 'Document Verification',
  hiring: 'Hiring Partner Stage',
  selection: 'Selection Results',
  testimonials: 'Testimonials',
};

const getFrontendBaseUrl = () => String(process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

const toId = (value) => String(value || '');
const allowedSensitiveStageKeys = ['evaluation', 'document-verification', 'selection'];

const ensureReviewPayload = (req, res) => {
  const reasonNote = sanitizeReasonNote(req.body?.reasonNote);
  const reviewConfirmed = req.body?.reviewConfirmed === true;
  const evidenceViewed = req.body?.evidenceViewed === true;

  if (!reasonNote) {
    res.status(400).json({ message: 'A decision reason or note is required.' });
    return null;
  }
  if (!reviewConfirmed) {
    res.status(400).json({ message: 'You must confirm that you reviewed the submission before deciding.' });
    return null;
  }
  if (!evidenceViewed) {
    res.status(400).json({ message: 'Open and review the submitted evidence before approving or rejecting.' });
    return null;
  }

  return {
    reasonNote,
    sourcePage: String(req.body?.sourcePage || '').trim(),
  };
};

const loadApprovalHistory = async (candidateId, req) => {
  const logs = await ApprovalAuditLog.find({ candidateId }).sort({ createdAt: -1 }).lean();
  return filterAuditEntriesForAdmin(logs, req);
};

const buildProgressSummary = ({ candidate, profile, eligibility, documents, interviews, payments, testimonial }) =>
  deriveCandidateProgress({ candidate, profile, eligibility, documents, interviews, payments, testimonial });

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

  const eligibilityDone = Boolean(eligibility?.isEligible) || Boolean(profile) || hasInitial || docsUploaded;

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
  const { candidate, profile, hasInitial, hasProgram, hasFinal, docsUploaded } = snapshot;
  const status = String(candidate?.status || '');
  const evaluationDecision = readStageDecision(candidate, 'evaluation');
  const declarationDecision = readStageDecision(candidate, 'declaration');
  const documentVerificationDecision = readStageDecision(candidate, 'document-verification');
  const hiringDecision = readStageDecision(candidate, 'hiring');
  const selectionDecision = readStageDecision(candidate, 'selection');

  if (status === 'process_complete') return 'testimonials';
  if (status === 'selected' && hasFinal) return 'testimonials';
  if (['accepted', 'rejected'].includes(selectionDecision)) return 'selection';
  if (['not_selected', 'rejected'].includes(status)) return 'selection';
  if (status === 'selected') return 'selection';
  if (status === 'interview_completed') return 'selection';
  if (status === 'sent_to_partners' || hiringDecision === 'accepted') return 'selection';
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
  if (hasProgram && documentVerificationDecision !== 'accepted') return 'document-verification';
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
      return false;
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

const formatDateSafe = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

const toHumanLabel = (value) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'N/A';

const mapCandidateListRow = (snapshot) => {
  const progress = deriveCandidateProgress({
    candidate: snapshot.candidate,
    profile: snapshot.profile,
    eligibility: snapshot.eligibility,
    documents: snapshot.documents,
    interviews: snapshot.interviews,
    payments: snapshot.payments,
    testimonial: snapshot.testimonial,
  });

  const displayName =
    snapshot.profile?.personalDetails?.firstName ||
    snapshot.candidate?.name ||
    snapshot.candidate?.email?.split('@')?.[0] ||
    'N/A';

  return {
    _id: snapshot.candidate._id,
    name: displayName,
    email: snapshot.candidate.email || '',
    phone: snapshot.candidate.phone || '',
    currentStage: progress.currentStage,
    currentStageKey: progress.currentStageKey,
    profileStatus: progress.profileStatus,
    evaluationStatus: progress.evaluationStatus,
    paymentStatus: progress.paymentStatus,
    documentStatus: progress.documentStatus,
    interviewStatus: progress.interviewStatus,
    selectionStatus: progress.selectionStatus,
    nextPendingAction: progress.nextAction,
    pendingFrom: progress.pendingFrom,
    pendingFromLabel: progress.pendingFrom === 'admin' ? 'Admin' : progress.pendingFrom === 'candidate' ? 'Candidate' : 'Completed',
    recommendedAdminAction: progress.recommendedAdminAction,
    lastUpdatedAt: formatDateSafe(snapshot.candidate.updatedAt),
    createdAt: formatDateSafe(snapshot.candidate.createdAt),
    paymentSummaryLabel: toHumanLabel(
      progress.paymentStatus.final === 'verified'
        ? 'verified'
        : progress.paymentStatus.program === 'pending_verification' || progress.paymentStatus.initial === 'pending_verification'
          ? 'pending_verification'
          : progress.paymentStatus.program === 'verified' || progress.paymentStatus.initial === 'verified'
            ? 'partially_verified'
            : 'not_started'
    ),
    documentStatusLabel: toHumanLabel(progress.documentStatus),
    interviewSelectionStatusLabel: toHumanLabel(progress.selectionStatus),
  };
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

const listAllCandidates = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  try {
    const skip = (page - 1) * limit;
    const sortBy = String(req.query.sortBy || 'updatedAt').toLowerCase() === 'createdat' ? 'createdAt' : 'updatedAt';
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const q = String(req.query.q || '').trim().toLowerCase();

    const snapshots = await fetchAllSnapshots();
    const rows = snapshots.map(mapCandidateListRow).sort((a, b) => {
      const aValue = new Date(a[sortBy] || 0).getTime();
      const bValue = new Date(b[sortBy] || 0).getTime();
      return sortOrder * (aValue - bValue);
    });

    const filtered = rows.filter((row) => {
      if (q && !(`${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(q))) return false;
      if (req.query.stage && row.currentStageKey !== String(req.query.stage).trim()) return false;
      if (req.query.profileStatus && row.profileStatus !== String(req.query.profileStatus).trim()) return false;
      if (req.query.evaluationStatus && row.evaluationStatus !== String(req.query.evaluationStatus).trim()) return false;
      if (req.query.paymentStatus && row.paymentSummaryLabel.toLowerCase().replaceAll(' ', '_') !== String(req.query.paymentStatus).trim()) return false;
      if (req.query.documentStatus && row.documentStatus !== String(req.query.documentStatus).trim()) return false;
      if (req.query.interviewStatus && row.interviewStatus !== String(req.query.interviewStatus).trim()) return false;
      if (req.query.selectionStatus && row.selectionStatus !== String(req.query.selectionStatus).trim()) return false;
      if (req.query.pendingFrom && row.pendingFrom !== String(req.query.pendingFrom).trim()) return false;
      return true;
    });

    const total = filtered.length;
    const pagedRows = filtered.slice(skip, skip + limit);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return res.json({
      candidates: pagedRows,
      total,
      page,
      totalPages,
      rows: pagedRows,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error('[admin:candidates:all] failed', {
      message: error?.message,
      stack: error?.stack,
      adminEmail: req.user?.email,
      adminRole: req.user?.adminRole,
      query: req.query,
    });
    return res.status(500).json({
      message: 'Failed to load candidates',
      candidates: [],
      total: 0,
      page,
      totalPages: 0,
    });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const snapshots = await fetchAllSnapshots();
    const rows = snapshots.map(mapCandidateListRow);

    const totalApplications = rows.length;
    const eligibleCandidates = snapshots.filter((s) => Boolean(s.eligibility?.isEligible)).length;
    const profilesPendingReview = rows.filter((row) => ['submitted', 'under_review'].includes(row.profileStatus)).length;
    const paymentsPendingVerification = rows.filter((row) =>
      ['pending_verification'].includes(row.paymentStatus.initial) ||
      ['pending_verification'].includes(row.paymentStatus.program) ||
      ['pending_verification'].includes(row.paymentStatus.final)
    ).length;
    const paymentsPendingVerificationInitial = rows.filter(
      (row) => row.paymentStatus?.initial === 'pending_verification'
    ).length;
    const paymentsPendingVerificationProgram = rows.filter(
      (row) => row.paymentStatus?.program === 'pending_verification'
    ).length;
    const paymentsPendingVerificationFinal = rows.filter(
      (row) => row.paymentStatus?.final === 'pending_verification'
    ).length;
    const documentsPendingVerification = rows.filter(
      (row) =>
        row.paymentStatus?.program === 'verified' &&
        ['uploaded', 'under_review', 'needs_revision'].includes(row.documentStatus)
    ).length;
    const hiringPendingAssignment = rows.filter((row) => row.currentStageKey === 'hiring' && row.pendingFrom === 'admin').length;
    const interviewsPendingScheduled = rows.filter(
      (row) => row.currentStageKey === 'selection' && row.pendingFrom === 'admin'
    ).length;
    const selectedCandidates = rows.filter((row) => row.selectionStatus === 'selected').length;
    const rejectedCandidates = rows.filter((row) => row.selectionStatus === 'rejected').length;
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
        eligibleCandidates,
        profilesPendingReview,
        paymentsPendingVerification,
        paymentsPendingVerificationInitial,
        paymentsPendingVerificationProgram,
        paymentsPendingVerificationFinal,
        documentsPendingVerification,
        hiringPendingAssignment,
        interviewsPendingScheduled,
        selectedCandidates,
        rejectedCandidates,
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
  program: getProgramFeeBreakdown(null).total,
  final: 3100,
};

const paymentStatusLabel = (rawStatus = '') => {
  const normalized = String(rawStatus || '').toLowerCase();
  if (normalized === 'completed') return 'Received';
  if (normalized === 'failed') return 'Not Received';
  if (normalized === 'pending') return 'Pending Verification';
  if (normalized === 'refunded') return 'Refunded';
  return 'Pending';
};

const expectedPaymentAmountForSnapshot = (type, snapshot) => {
  if (type === 'program') {
    return getProgramFeeBreakdown(snapshot?.profile).total;
  }
  return paymentExpectedAmount[type];
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
          amount: latest?.amount ?? expectedPaymentAmountForSnapshot(type, snapshot),
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

    const approvalHistory = await loadApprovalHistory(candidate._id, req);
    res.json({
      candidate,
      profile,
      documents,
      interviews,
      payments,
      eligibility,
      testimonial,
      adminNotes: candidate.adminNotes || '',
      approvalHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminCandidateProfile = async (req, res) => {
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
    const progress = deriveCandidateProgress({ candidate, profile, eligibility, documents, interviews, payments, testimonial });
    const approvalHistory = await loadApprovalHistory(candidate._id, req);
    return res.json({ candidate, profile, documents, interviews, payments, eligibility, testimonial, progress, adminNotes: candidate.adminNotes || '', approvalHistory });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getApprovalAuditHistory = async (req, res) => {
  try {
    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!permissions.includes('approval:read_audit_full') && !permissions.includes('approval:read_audit_limited')) {
      return res.status(403).json({ message: 'Audit history access is not allowed for this admin role.' });
    }
    const candidate = await User.findOne({ _id: req.params.candidateId, role: 'candidate' }).select('_id email').lean();
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const approvalHistory = await loadApprovalHistory(candidate._id, req);
    return res.json({ candidateId: candidate._id, candidateEmail: candidate.email || '', approvalHistory });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCandidateProfileStatus = async (req, res) => {
  try {
    const reviewPayload = ensureReviewPayload(req, res);
    if (!reviewPayload) return;
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

    const previousStatus = profile.status;
    profile.status = status;
    await profile.save();

    if (!candidate.stageStatuses) {
      candidate.stageStatuses = new Map();
    }

    if (status === 'accepted') {
      candidate.stageStatuses.set('evaluation', 'accepted');
      candidate.status = 'accepted';
    }
    if (status === 'rejected') {
      candidate.stageStatuses.set('evaluation', 'rejected');
      candidate.status = 'rejected';
    }
    if (status === 'under_review' || status === 'submitted') {
      candidate.stageStatuses.set('evaluation', 'under_review');
      candidate.status = 'profile_submitted';
    }
    await candidate.save();

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: 'evaluation',
      heading: status === 'accepted' ? 'Profile approved' : status === 'rejected' ? 'Profile rejected' : 'Profile kept under review',
      message:
        status === 'accepted'
          ? 'Your profile has been approved. Please complete the next steps from your dashboard.'
          : status === 'rejected'
            ? 'Your profile was not approved in the current review cycle. Your dashboard will now show this rejection and the next steps will remain inactive.'
            : 'Your profile is still under internal evaluation. No action is needed from you right now.',
      status,
      details: [
        { label: 'Profile Status', value: status },
        { label: 'Next Step', value: status === 'accepted' ? 'Complete the next dashboard step' : status === 'rejected' ? 'No further candidate action available' : 'Wait for final review decision' },
      ],
      cta: { label: 'View Dashboard', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard` },
    });

    const [eligibility, documents, interviews, payments, testimonial] = await Promise.all([
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);
    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'profile_evaluation',
      sectionRecordId: String(profile._id),
      previousStatus,
      newStatus: status,
      reasonNote: reviewPayload.reasonNote,
      sourcePage: reviewPayload.sourcePage,
    });
    const progress = buildProgressSummary({ candidate, profile: profile.toObject(), eligibility, documents, interviews, payments, testimonial });

    res.json({ profile, auditLog, progress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateDocumentStatus = async (req, res) => {
  try {
    const reviewPayload = ensureReviewPayload(req, res);
    if (!reviewPayload) return;
    const status = String(req.body?.status || '').trim();
    if (!validDocumentStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid document status' });
    }

    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const document = await Document.findOne({ _id: req.params.documentId, userId: candidate._id });
    if (!document) return res.status(404).json({ message: 'Document not found for this candidate' });

    const previousStatus = document.status;
    document.status = status;
    await document.save();

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: 'document_verification',
      heading: status === 'Accepted' ? 'Document approved' : status === 'Needs Revision' ? 'Document needs revision' : 'Document review updated',
      message:
        status === 'Accepted'
          ? 'Your document has been approved successfully.'
          : status === 'Needs Revision'
            ? 'Your document needs revision. Please upload the corrected and complete document details again from your dashboard.'
            : 'Your document review status has been updated.',
      status: String(status || '').toLowerCase().replaceAll(' ', '_'),
      details: [
        { label: 'Document Type', value: document.documentType || 'Document' },
        { label: 'Status', value: status },
      ],
      cta: { label: 'Open Documents', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/documents` },
    });

    const [profile, eligibility, documents, interviews, payments, testimonial] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);
    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'document_verification',
      sectionRecordId: String(document._id),
      previousStatus,
      newStatus: status,
      reasonNote: reviewPayload.reasonNote,
      sourcePage: reviewPayload.sourcePage,
    });
    const progress = buildProgressSummary({ candidate: candidate.toObject(), profile, eligibility, documents, interviews, payments, testimonial });

    res.json({ document, auditLog, progress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addCandidateInterview = async (req, res) => {
  try {
    return res.status(400).json({
      message: 'Interview scheduling is no longer part of the workflow. After hiring partner assignment, announce selection result directly.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const reviewPayload = ensureReviewPayload(req, res);
    if (!reviewPayload) return;
    const { paymentId } = req.params;
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!validPaymentStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const existingPayment = await Payment.findById(paymentId);
    if (!existingPayment) return res.status(404).json({ message: 'Payment not found' });
    const previousStatus = existingPayment.status;
    existingPayment.status = status;
    await existingPayment.save();
    const payment = existingPayment;
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
      heading: status === 'completed' ? 'Payment approved' : status === 'failed' ? 'Payment rejected' : 'Payment verification updated',
      message:
        status === 'completed'
          ? payment.type === 'program'
            ? 'Your payment has been approved. Your case is now pending document verification.'
            : 'Your payment has been approved. Please continue with the next steps shown on your dashboard.'
          : status === 'failed'
            ? 'Your payment verification was not approved. Please upload the complete and correct payment details again from your dashboard.'
            : 'Your payment verification status has been updated and is still pending completion.',
      status,
      details: [
        { label: 'Payment Type', value: payment.type },
        { label: 'Amount', value: `${payment.currency || 'USD'} ${payment.amount || 0}` },
        { label: 'Transaction ID', value: payment.transactionId || '—' },
      ],
      cta: {
        label: status === 'failed' ? 'Upload Correct Payment Details' : 'Open Dashboard',
        url: `${getFrontendBaseUrl()}/${status === 'failed' ? (payment.type === 'final' ? 'payment/final-payment' : payment.type === 'program' ? 'payment/program-fee' : 'initial-payment') : 'candidate-dashboard'}`,
      },
    });

    const [profile, eligibility, documents, interviews, payments, testimonial, refreshedCandidate] = await Promise.all([
      Profile.findOne({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate?._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      User.findById(candidate?._id).lean(),
    ]);
    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'payment_verification',
      sectionRecordId: String(payment._id),
      previousStatus,
      newStatus: status,
      reasonNote: reviewPayload.reasonNote,
      sourcePage: reviewPayload.sourcePage,
    });
    const progress = buildProgressSummary({ candidate: refreshedCandidate, profile, eligibility, documents, interviews, payments, testimonial });

    res.json({ payment, auditLog, progress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateNotes = async (req, res) => {
  try {
    const notes = String(req.body?.notes || '').trim();
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' }).select('-passwordHash');

    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const previousNotes = String(candidate.adminNotes || '').trim();
    candidate.adminNotes = notes;
    await candidate.save();

    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'admin_notes',
      sectionRecordId: 'admin_notes',
      previousStatus: previousNotes,
      newStatus: notes,
      decision: previousNotes === notes ? 'pending' : 'changed',
      reasonNote: notes || '(cleared)',
      sourcePage: String(req.body?.sourcePage || '/admin/candidates/notes').trim(),
    });

    res.json({ adminNotes: candidate.adminNotes || '', auditLog });
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
    const reviewPayload = allowedSensitiveStageKeys.includes(stageKey) ? ensureReviewPayload(req, res) : {
      reasonNote: sanitizeReasonNote(req.body?.reasonNote || 'Stage workflow update'),
      sourcePage: String(req.body?.sourcePage || '').trim(),
    };
    if (!reviewPayload) return;

    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const needsPermissionByStage = {
      evaluation: 'evaluation:approve',
      'document-verification': 'documents:verify',
    };
    const requiredPermission = needsPermissionByStage[stageKey];
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      return res.status(403).json({ message: `Missing permission: ${requiredPermission}` });
    }
    if (stageKey === 'selection' && !['super_admin', 'payment_admin'].includes(String(req.user?.adminRole || ''))) {
      return res.status(403).json({ message: 'Only super admin or payment admin can publish final selection decisions.' });
    }

    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const previousCandidateStatus = candidate.status;
    const previousStageStatus = readStageDecision(candidate, stageKey);

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

    const workflow = getWorkflowConfig();
    const actorEmail = normalizeEmail(req.user?.email || '');
    if (stageKey === 'evaluation' && status === 'accepted' && actorEmail === workflow.admin2) {
      try {
        await sendAdminNotification({
          to: workflow.admin3,
          subject: `NextStep Talent Candidate For Approval / ${candidate.name || candidate.email?.split('@')[0] || 'Candidate'}`,
          lines: [
            'Admin 2 approved the candidate and requires Admin 3 review.',
            `Candidate: ${candidate.name || candidate.email?.split('@')[0] || 'N/A'}`,
            `Email: ${candidate.email || 'N/A'}`,
            `Candidate ID: ${String(candidate._id)}`,
          ],
          fromType: 'noreply',
        });
      } catch (error) {
        console.error('Admin 3 approval notification failed:', error.message);
      }
    }

    if (stageKey === 'selection' && actorEmail === workflow.admin3) {
      try {
        await sendAdminNotification({
          to: workflow.admin12List,
          subject: `NextStep Talent Admin 3 Process Completed / ${candidate.name || candidate.email?.split('@')[0] || 'Candidate'}`,
          lines: [
            'Admin 3 has completed the selection-stage action for this candidate.',
            `Decision: ${status}`,
            `Candidate: ${candidate.name || candidate.email?.split('@')[0] || 'N/A'}`,
            `Email: ${candidate.email || 'N/A'}`,
            `Interview Required: ${req.body?.interviewRequired === false ? 'No' : 'Yes / To Be Scheduled'}`,
          ],
          fromType: 'noreply',
        });
      } catch (error) {
        console.error('Admin 1/2 completion notification failed:', error.message);
      }
    }

    const stageToEmailStep = {
      evaluation: 'evaluation',
      declaration: 'declaration',
      documents: 'documents',
      'background-verification': 'documents',
      'document-verification': 'document_verification',
      hiring: 'hiring',
      selection: 'selection',
      testimonials: 'testimonial',
    };

    const stageEmailConfig = (() => {
      if (stageKey === 'selection') {
        return {
          heading: status === 'accepted' ? 'Selection result: approved' : status === 'rejected' ? 'Selection result: not selected' : 'Selection result under review',
          message:
            status === 'accepted'
              ? 'Congratulations. You have been selected. Please pay the required fees shown in your dashboard to continue.'
              : status === 'rejected'
                ? 'Your selection result has been published and you were not selected in this cycle.'
                : 'Your selection result is still under review.',
        };
      }
      if (stageKey === 'document-verification') {
        return {
          heading: status === 'accepted' ? 'Document verification approved' : status === 'rejected' ? 'Document verification rejected' : 'Document verification updated',
          message: status === 'accepted' ? 'Your documents have been verified successfully.' : 'Your document verification status has been updated.',
        };
      }
      return {
        heading: 'Stage decision updated by admin',
        message: 'A stage decision has been updated in your process.',
      };
    })();

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: stageToEmailStep[stageKey] || 'profile',
      stepName: stagePageLabelMap[stageKey] || stageKey,
      heading: stageEmailConfig.heading,
      message: stageEmailConfig.message,
      status,
      details: [
        { label: 'Stage', value: stagePageLabelMap[stageKey] || stageKey },
        { label: 'Decision', value: status },
        ...(hiringPartner ? [{ label: 'Hiring Partner', value: hiringPartner }] : []),
      ],
      cta: { label: 'Open Dashboard', url: `${getFrontendBaseUrl()}/candidate-dashboard` },
    });

    const [profile, eligibility, documents, interviews, payments, testimonial, refreshedCandidate] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      User.findById(candidate._id).lean(),
    ]);
    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType:
        stageKey === 'selection'
          ? 'final_selection'
          : stageKey === 'evaluation'
              ? 'profile_evaluation'
              : stageKey === 'document-verification'
                ? 'document_verification'
                : 'stage_action',
      sectionRecordId: stageKey,
      previousStatus: `${previousStageStatus || previousCandidateStatus}`,
      newStatus: `${status || refreshedCandidate?.status}`,
      reasonNote: reviewPayload.reasonNote,
      sourcePage: reviewPayload.sourcePage,
    });
    const progress = buildProgressSummary({ candidate: refreshedCandidate, profile, eligibility, documents, interviews, payments, testimonial });

    return res.json({
      candidateId: candidate._id,
      stageKey,
      status,
      stageStatuses: candidate.stageStatuses,
      auditLog,
      progress,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listCandidatesByStage,
  listAllCandidates,
  getDashboardSummary,
  getPaymentsOverview,
  listPaymentsByType,
  getCandidateDetails,
  getAdminCandidateProfile,
  getApprovalAuditHistory,
  updateCandidateProfileStatus,
  updateCandidateDocumentStatus,
  addCandidateInterview,
  updatePaymentStatus,
  updateCandidateNotes,
  updateCandidateStageDecision,
};
