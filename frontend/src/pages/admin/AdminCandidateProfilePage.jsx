import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import ApprovalReviewModal from '../../components/admin/ApprovalReviewModal';
import AuditHistoryPanel from '../../components/admin/AuditHistoryPanel';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import {
  approveCandidateOperations,
  rejectCandidateOperations,
  fetchAdminCandidateProfile,
  sendCandidatePaymentInstruction,
  reviewCandidateDocument,
  reviewCandidateProfile,
  reviewCandidateStage,
  reviewPayment,
  scheduleCandidateInterview,
  updateCandidateNotes,
  initiateCandidateRefund,
} from '../../api/adminApi';
import usePermissions from '../../hooks/usePermissions';

const tabs = ['overview', 'profile', 'eligibility', 'payments', 'documents', 'hiring', 'selection', 'notes', 'history'];

const humanize = (value) =>
  String(value || '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const stageSequence = [
  'eligibility',
  'profile_submitted',
  'profile_review',
  'operations_approval',
  'initial_payment',
  'documents_upload',
  'program_payment',
  'document_verification',
  'selection',
  'final_payment',
  'testimonial',
];

const hiringPartnerOptions = [
  'Apex Talent Partners',
  'Nova Hiring Group',
  'Global Tech Recruiters',
  'BluePeak Staffing',
  'Summit Workforce Solutions',
];

const Card = ({ title, subtitle, children, actions }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
    <div className="mt-4">{children}</div>
  </div>
);

const KeyValueGrid = ({ rows = [] }) => (
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {rows.map((row) => (
      <div key={row.label} className="rounded-2xl bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">{row.label}</p>
        {String(row.label || '').toLowerCase().includes('additional information') || String(row.label || '').toLowerCase() === 'additional information' ? (
          <div className="mt-1 rounded-lg bg-white p-4 text-sm">
            <p className="text-slate-500">Notes</p>
            <p className="whitespace-pre-wrap font-medium text-slate-900 break-words break-all">{row.value || '—'}</p>
          </div>
        ) : (
          <p className="mt-1 break-words text-sm font-medium text-slate-800">{row.value || '—'}</p>
        )}
      </div>
    ))}
  </div>
);

const normalizeProfileDecision = (profileStatus, auditDecision) => {
  const fromProfile = String(profileStatus || '').toLowerCase();
  if (fromProfile === 'accepted') return 'approved';
  if (fromProfile === 'rejected') return 'rejected';
  if (fromProfile === 'under_review') return 'under_review';

  const fromAudit = String(auditDecision || '').toLowerCase();
  if (fromAudit === 'approved' || fromAudit === 'accepted') return 'approved';
  if (fromAudit === 'rejected') return 'rejected';
  return 'under_review';
};

const readStageDecision = (candidate, stageKey) => {
  const stageStatuses = candidate?.stageStatuses;
  if (!stageStatuses) return '';
  if (typeof stageStatuses.get === 'function') return String(stageStatuses.get(stageKey) || '').toLowerCase();
  return String(stageStatuses[stageKey] || '').toLowerCase();
};

export default function AdminCandidateProfilePage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const contentRef = useRef(null);
  const { can, role } = usePermissions();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeReview, setActiveReview] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [profileReviewNote, setProfileReviewNote] = useState('');
  const [profileReviewConfirmed, setProfileReviewConfirmed] = useState(false);
  const [profileReviewSubmitting, setProfileReviewSubmitting] = useState('');
  const [allowReviewedProfileEditor, setAllowReviewedProfileEditor] = useState(false);
  const [hiringPartnerDraft, setHiringPartnerDraft] = useState('');
  const [stageSaving, setStageSaving] = useState('');
  const [operationsSaving, setOperationsSaving] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundSaving, setRefundSaving] = useState(false);
  const [paymentActionSaving, setPaymentActionSaving] = useState('');
  const [refundSelection, setRefundSelection] = useState({});
  const [refundDeduction, setRefundDeduction] = useState('300');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState({});
  const [documentBulkComment, setDocumentBulkComment] = useState('');
  const [documentBulkSaving, setDocumentBulkSaving] = useState(false);
  const [interviewDraft, setInterviewDraft] = useState({
    country: '',
    role: '',
    date: '',
    time: '',
    meetingLink: '',
  });

  const canViewAuditHistory = String(role || '') === 'super_admin';
  const visibleTabs = useMemo(() => {
    const hiddenTabs = new Set();
    if (!canViewAuditHistory) hiddenTabs.add('history');
    if (String(role || '') === 'evaluation_admin') {
      hiddenTabs.add('payments');
      hiddenTabs.add('hiring');
      hiddenTabs.add('selection');
    }
    if (String(role || '') === 'operations_admin') {
      hiddenTabs.add('selection');
    }
    return tabs.filter((tab) => !hiddenTabs.has(tab));
  }, [canViewAuditHistory, role]);
  const activeTabParam = searchParams.get('tab');
  const activeTab = visibleTabs.includes(activeTabParam) ? activeTabParam : 'profile';
  const reviewParam = searchParams.get('review');
  const canReviewSelection = can('selection:publish');

  useEffect(() => {
    if (activeTabParam && visibleTabs.includes(activeTabParam)) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'profile');
      next.delete('review');
      return next;
    }, { replace: true });
  }, [activeTabParam, setSearchParams, visibleTabs]);

  // Auto-scroll to top when tab changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeTab]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await fetchAdminCandidateProfile(id);
      setData(data);
      setNotesDraft(data?.adminNotes || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate profile');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const candidate = data?.candidate;
  const profile = data?.profile;
  const eligibility = data?.eligibility;
  const payments = data?.payments || [];
  const documents = data?.documents || [];
  const progress = data?.progress;
  const approvalHistory = data?.approvalHistory || [];
  const documentVerificationDecision = readStageDecision(candidate, 'document-verification');
  const hiringDecision = readStageDecision(candidate, 'hiring');
  const selectionDecision = readStageDecision(candidate, 'selection');
  const documentVerificationAccepted = documentVerificationDecision === 'accepted' || progress?.documentStatus === 'verified';
  const hiringAccepted = hiringDecision === 'accepted' || Boolean(candidate?.assignedHiringPartner);
  const selectionAnnounced =
    ['accepted', 'rejected'].includes(selectionDecision) ||
    ['selected', 'rejected'].includes(String(progress?.selectionStatus || '').toLowerCase());
  // Admin 3 (operations_admin) can approve evaluation as the final approver
  const isAdmin3PendingEvaluation =
    String(role || '') === 'operations_admin' &&
    Boolean(candidate?.admin2EvaluationApproved) &&
    !candidate?.admin3EvaluationApproved &&
    readStageDecision(candidate, 'evaluation') !== 'accepted' &&
    readStageDecision(candidate, 'evaluation') !== 'rejected';

  const filteredHistory = (types) => approvalHistory.filter((item) => types.includes(item.approvalType));
  const isInlineProfileReview =
    activeTab === 'profile' &&
    reviewParam === 'evaluation' &&
    Boolean(profile) &&
    can('evaluation:approve') &&
    (profile?.status !== 'rejected' ? true : allowReviewedProfileEditor);
  const profileReviewHistory = filteredHistory(['profile_evaluation']);
  const lastProfileReview = profileReviewHistory[0] || null;
  const profileAlreadyReviewed =
    Boolean(lastProfileReview) ||
    ['accepted', 'rejected', 'under_review'].includes(String(profile?.status || '').toLowerCase());
  const profileDecisionState = normalizeProfileDecision(profile?.status, lastProfileReview?.decision);
  const notesHistory = filteredHistory(['admin_notes']);

  useEffect(() => {
    if (!candidate) return;
    const assigned = String(candidate.assignedHiringPartner || '').trim();
    if (assigned && !hiringPartnerDraft) {
      setHiringPartnerDraft(assigned);
    }
  }, [candidate, hiringPartnerDraft]);

  const evaluationAdminDocumentReviewUnlocked = useMemo(() => {
    const normalizedRole = String(role || '').toLowerCase();
    if (normalizedRole !== 'evaluation_admin') return true;

    const programPaymentApprovedForEvaluationAdmin = payments.some((payment) => {
      const type = String(payment?.type || '').toLowerCase();
      const status = String(payment?.status || '').toLowerCase();
      return type === 'program' && ['completed', 'verified', 'paid'].includes(status);
    });

    if (programPaymentApprovedForEvaluationAdmin) return true;

    const candidateStatus = String(candidate?.status || '').toLowerCase();
    const stagesUnlockedByStatus = new Set([
      'program_payment_complete',
      'documents_received',
      'sent_to_partners',
      'interview_completed',
      'selected',
      'not_selected',
      'rejected',
      'process_complete',
    ]);
    if (stagesUnlockedByStatus.has(candidateStatus)) return true;

    const programPaymentProgress = String(progress?.paymentStatus?.program || '').toLowerCase();
    if (programPaymentProgress === 'verified') return true;

    const currentStageKey = String(progress?.currentStageKey || '').toLowerCase();
    return ['document_verification', 'hiring', 'selection', 'final_payment', 'testimonial', 'completed'].includes(currentStageKey);
  }, [candidate?.status, payments, progress?.currentStageKey, progress?.paymentStatus?.program, role]);

  useEffect(() => {
    if (!data) return;
    const review = searchParams.get('review');
    if (!review) return;
    const canOpenDocumentReviewFromUrl =
      can('documents:verify') &&
      documents[0] &&
      evaluationAdminDocumentReviewUnlocked;

    if (review === 'document-verification' && canOpenDocumentReviewFromUrl) {
      setActiveReview({ type: 'document', item: documents[0] });
      return;
    }
    if (review === 'selection' && canReviewSelection) {
      setActiveReview({ type: 'selection' });
      return;
    }
    setActiveReview(null);
  }, [data, searchParams, documents, can, canReviewSelection, evaluationAdminDocumentReviewUnlocked]);

  useEffect(() => {
    if (!isInlineProfileReview) {
      setProfileReviewNote('');
      setProfileReviewConfirmed(false);
      setProfileReviewSubmitting('');
    }
  }, [isInlineProfileReview]);

  const setTab = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      next.delete('review');
      return next;
    });
  };

  const openProfileReview = () => {
    setAllowReviewedProfileEditor(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'profile');
      next.set('review', 'evaluation');
      return next;
    });
  };

  const closeReview = () => {
    setAllowReviewedProfileEditor(false);
    setActiveReview(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('review');
      return next;
    });
  };

  const stageIndex = stageSequence.indexOf(progress?.currentStageKey);
  const allStagesCompleted = String(progress?.currentStageKey || '').toLowerCase() === 'completed';

  const profileRows = useMemo(() => {
    if (!profile) return [];
    return [
      { label: 'Candidate Name', value: candidate?.name || candidate?.email },
      { label: 'Profile Status', value: humanize(profile.status) },
      { label: 'Email Verified', value: candidate?.emailVerified ? 'Yes' : 'No' },
      { label: 'Mobile No Provided', value: candidate?.phoneVerified ? 'Yes' : 'No' },
      { label: 'Financial Disclosure', value: profile.financialDisclosureAccepted ? 'Accepted' : 'Pending' },
      { label: 'Signature', value: profile.signature ? 'Submitted' : 'Pending' },
    ];
  }, [candidate, profile]);

  const profileSectionRows = useMemo(() => {
    if (!profile) return { personal: [], education: [], skills: [] };
    return {
      personal: [
        { label: 'First Name', value: profile.personalDetails?.firstName },
        { label: 'Middle Name', value: profile.personalDetails?.middleName },
        { label: 'Last Name', value: profile.personalDetails?.lastName },
        { label: 'Date of Birth', value: profile.personalDetails?.dateOfBirth },
        { label: 'Country of Birth', value: profile.personalDetails?.countryOfBirth },
        { label: 'Citizenship', value: profile.personalDetails?.citizenship },
        { label: 'Current Country of Residence', value: profile.personalDetails?.currentCountryOfResidence },
        { label: 'Current Visa Status', value: profile.personalDetails?.currentVisaStatus },
      ],
      education: [
        { label: 'High School Track', value: profile.education?.highSchool?.track },
        { label: 'High School Country', value: profile.education?.highSchool?.country },
        { label: 'High School Start', value: profile.education?.highSchool?.startDate },
        { label: 'High School End', value: profile.education?.highSchool?.endDate },
        { label: 'Diploma Field', value: profile.education?.diploma?.field },
        { label: 'Diploma Country', value: profile.education?.diploma?.country },
        { label: "Bachelor's Field", value: profile.education?.bachelors?.field },
        { label: "Bachelor's Country", value: profile.education?.bachelors?.country },
        { label: "Master's Field", value: profile.education?.masters?.field },
        { label: "Master's Country", value: profile.education?.masters?.country },
      ],
      skills: [
        { label: 'Technical Skills', value: profile.skills?.technical },
        { label: 'Soft Skills', value: profile.skills?.soft },
        { label: 'Additional Information', value: profile.additionalInfo },
      ],
    };
  }, [profile]);

  const saveNotes = async () => {
    setNotesSaving(true);
    try {
      await updateCandidateNotes(id, { notes: notesDraft, sourcePage: '/admin/candidates/notes' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save notes');
    } finally {
      setNotesSaving(false);
    }
  };

  const submitInlineProfileReview = async (decision) => {
    if (!profileReviewNote.trim() || !profileReviewConfirmed) return;
    setProfileReviewSubmitting(decision);
    try {
      await reviewCandidateProfile(id, {
        status: decision,
        reasonNote: profileReviewNote.trim(),
        reviewConfirmed: true,
        evidenceViewed: true,
        sourcePage: '/admin/candidates/profile',
      });
      closeReview();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit profile review');
    } finally {
      setProfileReviewSubmitting('');
    }
  };

  const submitReview = async ({ decision, reasonNote, reviewConfirmed, evidenceViewed }) => {
    if (!activeReview) return;

    if (activeReview.type === 'profile') {
      await reviewCandidateProfile(id, {
        status: decision,
        reasonNote,
        reviewConfirmed,
        evidenceViewed,
        sourcePage: '/admin/candidates/profile',
      });
    }

    if (activeReview.type === 'document') {
      await reviewCandidateDocument(id, activeReview.item._id, {
        status: decision,
        reasonNote,
        adminComment: decision === 'Needs Revision' ? reasonNote : '',
        reviewConfirmed,
        evidenceViewed,
        sourcePage: '/admin/candidates/documents',
      });
    }

    if (activeReview.type === 'payment') {
      await reviewPayment(activeReview.item._id, {
        status: decision,
        reasonNote,
        reviewConfirmed,
        evidenceViewed,
        sourcePage: '/admin/candidates/payments',
      });
    }

    if (activeReview.type === 'selection') {
      await reviewCandidateStage(id, 'selection', {
        status: decision,
        reasonNote,
        reviewConfirmed,
        evidenceViewed,
        sourcePage: '/admin/candidates/selection',
      });
    }

    closeReview();
    await load();
  };

  const submitHiringDecision = async (status) => {
    const normalizedStatus = String(status || '').toLowerCase();
    if (normalizedStatus === 'accepted' && !hiringPartnerDraft.trim()) {
      setError('Hiring partner is required before sending candidate to hiring stage.');
      return;
    }

    setStageSaving('hiring');
    setError('');
    try {
      await reviewCandidateStage(id, 'hiring', {
        status: normalizedStatus,
        hiringPartner: normalizedStatus === 'accepted' ? hiringPartnerDraft.trim() : '',
        reasonNote:
          normalizedStatus === 'accepted'
            ? `Assigned to hiring partner: ${hiringPartnerDraft.trim()}`
            : 'Hiring stage status updated by admin',
        sourcePage: '/admin/candidates/hiring',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update hiring stage');
    } finally {
      setStageSaving('');
    }
  };

  const submitOperationsApproval = async () => {
    setOperationsSaving('approved');
    setError('');
    try {
      await approveCandidateOperations(id, {
        reasonNote: 'Operations approval granted after evaluation review',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve candidate');
    } finally {
      setOperationsSaving('');
    }
  };

  const submitOperationsRejection = async () => {
    setOperationsSaving('rejected');
    setError('');
    try {
      await rejectCandidateOperations(id, {
        reasonNote: 'Operations rejection issued after review',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject candidate');
    } finally {
      setOperationsSaving('');
    }
  };

  const submitInterviewSchedule = async () => {
    if (!candidate?._id) return;
    const payload = {
      hiringPartner: hiringPartnerDraft.trim() || candidate?.assignedHiringPartner || 'Hiring Partner',
      country: interviewDraft.country.trim() || 'N/A',
      role: interviewDraft.role.trim(),
      date: interviewDraft.date.trim(),
      time: interviewDraft.time.trim(),
      meetingLink: interviewDraft.meetingLink.trim(),
    };
    if (!payload.role || !payload.date || !payload.time) {
      setError('Interview role, date, and time are required.');
      return;
    }

    setOperationsSaving('schedule_interview');
    setError('');
    try {
      await scheduleCandidateInterview(id, payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule interview');
    } finally {
      setOperationsSaving('');
    }
  };

  const openRefundModal = () => {
    const initialSelection = {};
    (payments || []).forEach((p) => {
      const status = String(p.status || '').toLowerCase();
      const canPick = ['completed', 'verified', 'paid'].includes(status) && status !== 'refunded';
      if (canPick) initialSelection[p._id] = false;
    });
    setRefundSelection(initialSelection);
    setRefundDeduction('300');
    setRefundOpen(true);
  };

  const submitRefund = async () => {
    const paymentIds = Object.entries(refundSelection)
      .filter(([, selected]) => selected)
      .map(([paymentId]) => paymentId);
    if (!paymentIds.length) {
      alert('Select at least one payment to refund.');
      return;
    }
    const adminDeduction = Number(refundDeduction);
    if (!Number.isFinite(adminDeduction) || adminDeduction < 0) {
      alert('Enter a valid administrative deduction amount.');
      return;
    }

    setRefundSaving(true);
    setError('');
    try {
      await initiateCandidateRefund(id, { paymentIds, adminDeduction });
      setRefundOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate refund');
    } finally {
      setRefundSaving(false);
    }
  };

  const selectedDocuments = (documents || []).filter((doc) => Boolean(selectedDocumentIds[doc._id]));
  const allDocumentsApproved = documents.length > 0 && documents.every((doc) => String(doc?.status || '') === 'Accepted');
  const toggleDocumentSelection = (documentId, checked) => {
    setSelectedDocumentIds((prev) => ({ ...prev, [documentId]: checked }));
  };

  const applyBulkDocumentAction = async (status) => {
    if (!selectedDocuments.length) {
      alert('Select at least one document.');
      return;
    }
    if (status === 'Needs Revision' && !documentBulkComment.trim()) {
      alert('Add a comment before requesting reupload.');
      return;
    }
    setDocumentBulkSaving(true);
    setError('');
    try {
      for (const doc of selectedDocuments) {
        await reviewCandidateDocument(id, doc._id, {
          status,
          reasonNote:
            status === 'Accepted'
              ? 'Bulk approval of selected documents by admin.'
              : `Bulk reupload requested. ${documentBulkComment.trim()}`,
          adminComment: status === 'Needs Revision' ? documentBulkComment.trim() : '',
          reviewConfirmed: true,
          evidenceViewed: true,
          sourcePage: '/admin/candidates/documents',
        });
      }
      setSelectedDocumentIds({});
      setDocumentBulkComment('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply bulk document action');
    } finally {
      setDocumentBulkSaving(false);
    }
  };

  const sendPaymentInstruction = async (type) => {
    const normalizedType = String(type || '').toLowerCase();
    if (!['program', 'final'].includes(normalizedType)) return;
    setPaymentActionSaving(`send-${normalizedType}`);
    setError('');
    try {
      await sendCandidatePaymentInstruction(id, { type: normalizedType });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send payment instruction email');
    } finally {
      setPaymentActionSaving('');
    }
  };

  const markPaymentComplete = async (payment, sourceType) => {
    if (!payment?._id) return;
    const normalizedType = String(sourceType || payment?.type || '').toLowerCase();
    setPaymentActionSaving(`complete-${normalizedType}`);
    setError('');
    try {
      await reviewPayment(payment._id, {
        status: 'completed',
        reasonNote: normalizedType === 'program'
          ? 'Payment marked completed by admin after receipt confirmation over email.'
          : 'Final payment marked completed by admin after receipt confirmation over email.',
        reviewConfirmed: true,
        evidenceViewed: true,
        sourcePage: '/admin/candidates/payments',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark payment completed');
    } finally {
      setPaymentActionSaving('');
    }
  };

  const reviewConfig = (() => {
    if (!activeReview) return null;

    if (activeReview.type === 'document') {
      return {
        title: 'Document Verification Review',
        currentStage: 'Document Verification',
        currentStatus: activeReview.item?.status,
        summaryRows: [
          { label: 'Document Type', value: activeReview.item?.documentType },
          { label: 'Uploaded At', value: formatDate(activeReview.item?.uploadedAt) },
          { label: 'Current Status', value: activeReview.item?.status },
        ],
        evidenceItems: [
          {
            key: `document-${activeReview.item?._id}`,
            label: 'Open uploaded document',
            description: 'Open the submitted file and inspect it before deciding.',
            href: `${getBackendBaseUrl()}${activeReview.item?.fileUrl || ''}`,
            buttonLabel: 'Open Document',
          },
        ],
        history: filteredHistory(['document_verification']).filter((item) => item.sectionRecordId === String(activeReview.item?._id)),
        decisionOptions: [
          { label: 'Approve Document', value: 'Accepted', variant: 'primary' },
          { label: 'Needs Revision', value: 'Needs Revision', variant: 'danger' },
          { label: 'Keep Under Review', value: 'Under Review', variant: 'secondary' },
        ],
      };
    }

    if (activeReview.type === 'payment') {
      const paymentType = String(activeReview.item?.type || '').toLowerCase();
      const isMailReceiptFlow = paymentType === 'program' || paymentType === 'final';
      return {
        title: 'Payment Verification Review',
        currentStage: 'Payment Verification',
        currentStatus: activeReview.item?.status,
        summaryRows: [
          { label: 'Payment Type', value: humanize(activeReview.item?.type) },
          { label: 'Amount', value: `${activeReview.item?.currency || 'USD'} ${activeReview.item?.amount || 0}` },
          { label: 'Transaction ID', value: activeReview.item?.transactionId || '—' },
          { label: 'Bank Reference', value: activeReview.item?.bankReference || '—' },
        ],
        evidenceItems: [
          ...(activeReview.item?.receiptUrl
            ? [{
                key: `payment-${activeReview.item?._id}`,
                label: 'Open uploaded payment proof',
                description: 'Review the uploaded receipt or payment screenshot.',
                href: `${getBackendBaseUrl()}${activeReview.item?.receiptUrl}`,
                buttonLabel: 'Open Receipt',
              }]
            : []),
        ],
        history: filteredHistory(['payment_verification']).filter((item) => item.sectionRecordId === String(activeReview.item?._id)),
        decisionOptions: isMailReceiptFlow
          ? [
              { label: 'Mark Payment Received', value: 'completed', variant: 'primary' },
              { label: 'Keep Pending', value: 'pending', variant: 'secondary' },
            ]
          : [
              { label: 'Approve Payment', value: 'completed', variant: 'primary' },
              { label: 'Reject Payment', value: 'failed', variant: 'danger' },
              { label: 'Keep Pending', value: 'pending', variant: 'secondary' },
            ],
      };
    }

    if (activeReview.type === 'selection') {
      return {
        title: 'Final Selection Review',
        currentStage: 'Selection Result',
        currentStatus: progress?.selectionStatus,
        summaryRows: [
          { label: 'Current Selection Status', value: humanize(progress?.selectionStatus) },
          { label: 'Hiring Stage', value: hiringAccepted ? 'Completed' : 'Pending' },
          { label: 'Hiring Partner', value: candidate?.assignedHiringPartner || '—' },
          { label: 'Candidate Current Stage', value: progress?.currentStage || '—' },
        ],
        evidenceItems: [],
        history: filteredHistory(['final_selection', 'interview_selection']),
        decisionOptions: [
          { label: 'Mark Selected', value: 'accepted', variant: 'primary' },
          { label: 'Mark Not Selected', value: 'rejected', variant: 'danger' },
          { label: 'Keep Under Review', value: 'under_review', variant: 'secondary' },
        ],
      };
    }

    return null;
  })();

  const buildProfilePdf = () => {
    if (!profile) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
    const topMargin = 36;
    const bottomMargin = 36;
    const contentWidth = pageWidth - marginX * 2;
    const rowGap = 12;
    let y = topMargin;

    const safe = (value) => String(value || '—');

    const addPageHeader = () => {
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(marginX, 24, contentWidth, 72, 10, 10, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Candidate Profile Report', marginX + 16, 54);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, marginX + 16, 72);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(safe(candidate?.name || candidate?.email), pageWidth - marginX - 16, 54, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(safe(candidate?.email), pageWidth - marginX - 16, 72, { align: 'right' });
      doc.setTextColor(17, 24, 39);
      y = 118;
    };

    const ensureSpace = (requiredHeight = 20) => {
      if (y + requiredHeight > pageHeight - bottomMargin) {
        doc.addPage();
        addPageHeader();
      }
    };

    const drawSectionTitle = (title) => {
      ensureSpace(34);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(title, marginX, y);
      y += 8;
      doc.setDrawColor(203, 213, 225);
      doc.line(marginX, y + 4, pageWidth - marginX, y + 4);
      y += 16;
    };

    const drawFieldGrid = (rows = []) => {
      const filteredRows = rows.filter((row) => row?.label);
      if (!filteredRows.length) return;

      const gap = 12;
      const colWidth = (contentWidth - gap) / 2;
      for (let i = 0; i < filteredRows.length; i += 2) {
        const left = filteredRows[i];
        const right = filteredRows[i + 1] || null;

        const leftValueLines = doc.splitTextToSize(safe(left.value), colWidth - 20);
        const rightValueLines = right ? doc.splitTextToSize(safe(right.value), colWidth - 20) : [];

        const lineHeight = 12;
        const valueBlockHeight = Math.max(leftValueLines.length, rightValueLines.length, 1) * lineHeight;
        const boxHeight = 36 + valueBlockHeight;

        ensureSpace(boxHeight + rowGap);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(marginX, y, colWidth, boxHeight, 8, 8, 'FD');
        if (right) doc.roundedRect(marginX + colWidth + gap, y, colWidth, boxHeight, 8, 8, 'FD');

        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(safe(left.label).toUpperCase(), marginX + 10, y + 16);
        if (right) doc.text(safe(right.label).toUpperCase(), marginX + colWidth + gap + 10, y + 16);

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.text(leftValueLines, marginX + 10, y + 32);
        if (right) doc.text(rightValueLines, marginX + colWidth + gap + 10, y + 32);

        y += boxHeight + rowGap;
      }
    };

    const addSection = (title, rows = []) => {
      if (!rows.length) return;
      drawSectionTitle(title);
      drawFieldGrid(rows);
      y += 4;
    };

    addPageHeader();

    addSection('Candidate Details', [
      { label: 'Candidate ID', value: candidate?._id },
      { label: 'Name', value: candidate?.name || candidate?.email },
      { label: 'Email', value: candidate?.email },
      { label: 'Phone', value: candidate?.phone },
      { label: 'Status', value: humanize(candidate?.status) },
      { label: 'Current Stage', value: progress?.currentStage || '—' },
    ]);

    addSection('Profile Summary', profileRows);
    addSection('Personal Details', profileSectionRows.personal);
    addSection('Education', profileSectionRows.education);
    addSection('Skills and Additional Information', profileSectionRows.skills);

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - marginX, pageHeight - 14, { align: 'right' });
    }

    const safeName = String(candidate?.name || candidate?.email || 'candidate')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return { doc, fileName: `${safeName || 'candidate'}-profile.pdf` };
  };

  const exportProfile = () => {
    const pdf = buildProfilePdf();
    if (!pdf) return;
    pdf.doc.save(pdf.fileName);
  };

  const openProfilePdf = () => {
    const pdf = buildProfilePdf();
    if (!pdf) return;
    const blobUrl = pdf.doc.output('bloburl');
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  };

  const canReviewPayment = (payment) => {
    if (!can('payments:verify') || !payment) return false;
    const type = String(payment.type || '').toLowerCase();
    const status = String(payment.status || '').toLowerCase();

    // Initial payment completed through Stripe does not require manual admin review.
    if (type === 'initial' && status === 'completed') return false;
    return true;
  };

  const latestReviewablePayment = payments.find((payment) => canReviewPayment(payment)) || null;
  const latestProgramPayment = payments.find((payment) => String(payment?.type || '').toLowerCase() === 'program') || null;
  const latestFinalPayment = payments.find((payment) => String(payment?.type || '').toLowerCase() === 'final') || null;
  const programPaymentCompleted = ['completed', 'verified', 'paid'].includes(String(latestProgramPayment?.status || '').toLowerCase());
  const finalPaymentCompleted = ['completed', 'verified', 'paid'].includes(String(latestFinalPayment?.status || '').toLowerCase());
  const canSendProgramInstruction = can('payments:verify') && !programPaymentCompleted && documents.length > 0;
  const canSendFinalInstruction =
    can('payments:verify') &&
    !finalPaymentCompleted &&
    programPaymentCompleted &&
    String(candidate?.status || '').toLowerCase() === 'selected';
  const canMarkProgramComplete = can('payments:verify') && Boolean(latestProgramPayment) && !programPaymentCompleted;
  const canMarkFinalComplete = can('payments:verify') && Boolean(latestFinalPayment) && !finalPaymentCompleted;
  const latestPendingReviewPayment = payments.find((payment) => {
    const status = String(payment?.status || '').toLowerCase();
    return canReviewPayment(payment) && status === 'pending';
  }) || latestReviewablePayment;
  const canReviewDocument = (document) => {
    if (!can('documents:verify') || !document) return false;
    if (!evaluationAdminDocumentReviewUnlocked) return false;
    return true;
  };
  const latestReviewableDocument = documents.find((document) => canReviewDocument(document)) || null;
  const showProgramPaymentPendingMessage = String(role || '') === 'evaluation_admin' && !evaluationAdminDocumentReviewUnlocked;

  const latestActionCard = useMemo(() => {
    const currentStageKey = String(progress?.currentStageKey || '').toLowerCase();
    const paymentNeedsAdminReview = ['initial', 'program', 'final'].some(
      (paymentType) => String(progress?.paymentStatus?.[paymentType] || '').toLowerCase() === 'pending_verification'
    );

    const base = {
      stageLabel: humanize(currentStageKey || 'overview'),
      pendingFrom: String(progress?.pendingFrom || 'completed').toLowerCase(),
      nextAction: progress?.nextAction || 'No pending action',
      latestUpdate: candidate?.updatedAt ? formatDate(candidate.updatedAt) : '—',
      buttonLabel: '',
      onClick: null,
      helperText: '',
    };

    if (can('evaluation:approve') && profile && (currentStageKey === 'profile_review' || currentStageKey === 'operations_approval' || isAdmin3PendingEvaluation)) {
      const isOperationsApproval = currentStageKey === 'operations_approval' || isAdmin3PendingEvaluation;
      return {
        ...base,
        buttonLabel: isOperationsApproval ? 'Open Operations Approval' : profileAlreadyReviewed ? 'Edit Response' : 'Review Internal Evaluation',
        onClick: isOperationsApproval ? () => setTab('hiring') : openProfileReview,
        helperText: isAdmin3PendingEvaluation
          ? 'Admin 2 has approved this candidate. Operations approval is required before account creation can begin.'
          : currentStageKey === 'operations_approval'
            ? 'Admin 2 has approved this candidate. Operations approval is required before account creation can begin.'
            : 'Profile review is the current required admin action.',
      };
    }

    if (can('payments:verify') && latestPendingReviewPayment && paymentNeedsAdminReview) {
      return {
        ...base,
        buttonLabel: 'Review Latest Payment',
        onClick: () => setActiveReview({ type: 'payment', item: latestPendingReviewPayment }),
        helperText: 'A payment is waiting for admin verification.',
      };
    }

    if (latestReviewableDocument && currentStageKey === 'document_verification') {
      return {
        ...base,
        buttonLabel: 'Review Latest Document',
        onClick: () => setActiveReview({ type: 'document', item: latestReviewableDocument }),
        helperText: 'Documents are ready for verification review.',
      };
    }

    if (canReviewSelection && currentStageKey === 'selection' && hiringAccepted) {
      return {
        ...base,
        buttonLabel: 'Review Final Selection',
        onClick: () => setActiveReview({ type: 'selection' }),
        helperText: 'Hiring transfer is complete. Selection decision can be announced.',
      };
    }

    return {
      ...base,
      helperText:
        base.pendingFrom === 'candidate'
          ? 'Latest action is pending from candidate.'
          : base.pendingFrom === 'admin'
            ? 'Latest action is pending from admin.'
            : 'No immediate action is required.',
    };
  }, [
    progress,
    candidate?.updatedAt,
    candidate?.admin2EvaluationApproved,
    candidate?.admin3EvaluationApproved,
    can,
    profile,
    profileAlreadyReviewed,
    openProfileReview,
    isAdmin3PendingEvaluation,
    canReviewSelection,
    hiringAccepted,
    latestPendingReviewPayment,
    latestReviewableDocument,
  ]);

  const tabNotificationCounts = useMemo(() => {
    const counts = {};
    const pendingFromAdmin = String(progress?.pendingFrom || '').toLowerCase() === 'admin';
    const stageKey = String(progress?.currentStageKey || '').toLowerCase();
    const normalizedRole = String(role || '');
    const hasPaymentInstructionPending = can('payments:verify') && (canSendProgramInstruction || canSendFinalInstruction);

    if (hasPaymentInstructionPending) counts.payments = 1;
    if (!pendingFromAdmin) return counts;

    if (stageKey === 'profile_review' && can('evaluation:approve')) counts.profile = 1;
    if (stageKey === 'document_verification' && can('documents:verify')) counts.documents = 1;
    if (stageKey === 'hiring' && can('candidates:update')) counts.hiring = 1;
    if (stageKey === 'selection' && can('selection:publish')) counts.selection = 1;
    if (!counts.payments && ['initial_payment', 'program_payment', 'final_payment'].includes(stageKey) && can('payments:verify')) counts.payments = 1;

    return counts;
  }, [progress?.pendingFrom, progress?.currentStageKey, can, role, canSendProgramInstruction, canSendFinalInstruction]);

  return (
    <section ref={contentRef} className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(200,169,107,0.18),_transparent_28%),linear-gradient(135deg,#0f172a,#1e293b)] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#c8a96b]">Admin Review Workspace</p>
            <h1 className="mt-2 text-3xl font-bold">{candidate?.name || candidate?.email || 'Candidate Review'}</h1>
            <p className="mt-2 text-sm text-slate-300">{candidate?.email || '—'} {candidate?.phone ? `• ${candidate.phone}` : ''}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile ? (
                <Button variant="adminSecondary" onClick={openProfilePdf} className="px-3 py-2 text-xs text-white">
                  Open Profile
                </Button>
              ) : null}
              {profile ? (
                <Button variant="adminSecondary" onClick={exportProfile} className="px-3 py-2 text-xs text-white">
                  Export Profile
                </Button>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Pending From</p>
            <p className="mt-1 text-sm font-semibold text-white">{humanize(progress?.pendingFrom)}</p>
            <p className="mt-2 text-xs text-slate-400">{humanize(role)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Current Stage</p>
            <p className="mt-1 text-sm font-semibold">{progress?.currentStage || '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Next Required Action</p>
            <p className="mt-1 text-sm font-semibold">{progress?.nextAction || '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Recommended Admin Action</p>
            <p className="mt-1 text-sm font-semibold">{progress?.recommendedAdminAction || '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Candidate Status</p>
            <p className="mt-1 text-sm font-semibold">{humanize(candidate?.status)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {stageSequence.map((stage, index) => (
            <span
              key={stage}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                allStagesCompleted ? 'bg-emerald-500/20 text-emerald-100' :
                index < stageIndex ? 'bg-emerald-500/20 text-emerald-100' :
                index === stageIndex ? 'bg-[#c8a96b] text-black' :
                'bg-white/5 text-slate-400'
              }`}
            >
              {humanize(stage)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-[#bdbdc3] hover:!text-white'
            }`}
            onClick={() => setTab(tab)}
          >
            <span className="inline-flex items-center gap-2">
              <span>{humanize(tab)}</span>
              {Number(tabNotificationCounts[tab] || 0) > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {tabNotificationCounts[tab]}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {loading && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading candidate workspace...</p>}
      {!!error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}

      {!loading && !error && candidate && activeTab === 'overview' && (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card title="Status Snapshot" subtitle="At-a-glance summary for support and approval decisions.">
            <KeyValueGrid rows={[
              { label: 'Eligibility', value: humanize(progress?.eligibilityStatus) },
              { label: 'Profile Review', value: humanize(progress?.profileStatus) },
              { label: 'Document Status', value: humanize(progress?.documentStatus) },
              { label: 'Selection Status', value: humanize(progress?.selectionStatus) },
              { label: 'Initial Payment', value: humanize(progress?.paymentStatus?.initial) },
              { label: 'Program Payment', value: humanize(progress?.paymentStatus?.program) },
            ]} />
          </Card>
          <Card title="Available Review Actions" subtitle="Restricted by your role permissions.">
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Latest Stage</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{latestActionCard.stageLabel}</p>
                <p className="mt-2 text-xs text-slate-600">Pending From: {humanize(latestActionCard.pendingFrom)}</p>
                <p className="mt-1 text-xs text-slate-600">Next Action: {latestActionCard.nextAction}</p>
                <p className="mt-1 text-xs text-slate-500">Last Update: {latestActionCard.latestUpdate}</p>
              </div>
              {latestActionCard.buttonLabel && latestActionCard.onClick ? (
                <Button variant="adminPrimary" onClick={latestActionCard.onClick}>{latestActionCard.buttonLabel}</Button>
              ) : null}
              <p className="text-xs text-slate-600">{latestActionCard.helperText}</p>
              {!can('evaluation:approve') && !can('documents:verify') && !can('payments:verify') && !can('candidates:update') ? (
                <p className="text-sm text-slate-500">This role can view the case but cannot create restricted approval decisions.</p>
              ) : null}
            </div>
          </Card>
        </div>
      )}

      {!loading && !error && candidate && activeTab === 'profile' && (
        <div className="space-y-5">
          {isInlineProfileReview ? (
            <Card
              title="Internal Evaluation Review"
              subtitle="Complete-page review workspace for profile evaluation. Review the full submitted profile below before making a decision."
              actions={<Button variant="adminGhost" onClick={closeReview}>Exit Review</Button>}
            >
              <div className="space-y-5">
                <div className="rounded-2xl border border-[rgba(200,169,107,0.28)] bg-[rgba(200,169,107,0.1)] p-4">
                  <p className="text-sm font-semibold text-slate-900">{candidate?.name || candidate?.email}</p>
                  <p className="mt-1 text-sm text-slate-600">{candidate?.email || '—'}</p>
                  <p className="mt-3 text-sm text-slate-700">This page is the full internal evaluation workspace. Review the submitted profile below, add a reason, then record your decision.</p>
                </div>

                <KeyValueGrid rows={profileRows} />

                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="profile-review-note">Decision Reason / Note</label>
                  <textarea
                    id="profile-review-note"
                    className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[rgba(200,169,107,0.5)]"
                    placeholder="Explain what you reviewed and why you are approving, rejecting, or keeping this profile under review."
                    value={profileReviewNote}
                    onChange={(event) => setProfileReviewNote(event.target.value)}
                  />
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={profileReviewConfirmed}
                    onChange={(event) => setProfileReviewConfirmed(event.target.checked)}
                  />
                  <span>I have reviewed the submitted candidate profile on this page and understand this action will be recorded in the audit history.</span>
                </label>

                {(!profileReviewNote.trim() || !profileReviewConfirmed) && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-semibold">Before you can submit a decision:</p>
                    <ul className="mt-2 space-y-1">
                      {!profileReviewNote.trim() ? <li>Add a decision reason or note.</li> : null}
                      {!profileReviewConfirmed ? <li>Confirm that you reviewed the profile.</li> : null}
                    </ul>
                  </div>
                )}

                {canViewAuditHistory ? (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Previous Approval History</h3>
                    <div className="mt-3">
                      <AuditHistoryPanel history={filteredHistory(['profile_evaluation'])} />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="adminSecondary" onClick={() => submitInlineProfileReview('under_review')} disabled={!profileReviewNote.trim() || !profileReviewConfirmed || Boolean(profileReviewSubmitting)} className="text-white">
                    {profileReviewSubmitting === 'under_review' ? 'Saving...' : 'Keep Under Review'}
                  </Button>
                  <Button variant="danger" onClick={() => submitInlineProfileReview('rejected')} disabled={!profileReviewNote.trim() || !profileReviewConfirmed || Boolean(profileReviewSubmitting)}>
                    {profileReviewSubmitting === 'rejected' ? 'Saving...' : 'Reject Profile'}
                  </Button>
                  <Button variant="adminPrimary" onClick={() => submitInlineProfileReview('accepted')} disabled={!profileReviewNote.trim() || !profileReviewConfirmed || Boolean(profileReviewSubmitting)}>
                    {profileReviewSubmitting === 'accepted' ? 'Saving...' : 'Approve Profile'}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <Card
            title="Submitted Profile"
            subtitle="Full candidate profile submission for evaluation review."
            actions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {profile ? (
                  <Button variant="adminSecondary" onClick={openProfilePdf} className="px-3 py-2 text-xs !text-white">
                    Open Profile
                  </Button>
                ) : null}
                {profile ? (
                  <Button variant="adminSecondary" onClick={exportProfile} className="px-3 py-2 text-xs !text-white">
                    Export Profile
                  </Button>
                ) : null}
                {can('evaluation:approve') && profile ? (
                  profileAlreadyReviewed && lastProfileReview ? (
                    <>
                      <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        profileDecisionState === 'approved' ? 'bg-emerald-700 text-white' :
                        profileDecisionState === 'rejected' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {profileDecisionState === 'approved' ? '✓ Profile Approved' :
                         profileDecisionState === 'rejected' ? '✗ Profile Rejected' :
                         '— Under Review'}
                      </div>
                      <Button variant="adminSecondary" onClick={openProfileReview} className="px-3 py-2 text-xs !text-white">Edit Response</Button>
                    </>
                  ) : (
                    <Button variant="adminPrimary" onClick={openProfileReview}>{isInlineProfileReview ? 'Review In Progress' : 'Review & Decide'}</Button>
                  )
                ) : null}
              </div>
            }
          >
            {profile ? (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Profile Summary</h3>
                  <KeyValueGrid rows={profileRows} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Personal Details</h3>
                  <KeyValueGrid rows={profileSectionRows.personal} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Education</h3>
                  <KeyValueGrid rows={profileSectionRows.education} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Skills and Additional Information</h3>
                  <KeyValueGrid rows={profileSectionRows.skills} />
                </div>
              </div>
            ) : <p className="text-sm text-slate-500">No profile submitted yet.</p>}
          </Card>
        </div>
      )}

      {!loading && !error && candidate && activeTab === 'eligibility' && (
        <Card title="Eligibility Submission" subtitle="Original intake and eligibility responses.">
          {eligibility ? <KeyValueGrid rows={[
            { label: 'Destination', value: eligibility.destination },
            { label: 'Country', value: eligibility.country },
            { label: 'IT Background', value: eligibility.hasITBackground ? 'Yes' : 'No' },
            { label: 'Qualification', value: eligibility.qualification },
            { label: 'Current Location', value: eligibility.currentLocation },
            { label: 'Eligible', value: eligibility.isEligible ? 'Yes' : 'No' },
          ]} /> : <p className="text-sm text-slate-500">No eligibility record found.</p>}
        </Card>
      )}

      {!loading && !error && candidate && activeTab === 'payments' && (
        <Card
          title="Payments"
          subtitle="Send payment instructions by email, then mark completed after receipt confirmation over email."
          actions={(
            <div className="flex flex-wrap gap-2">
              {canSendProgramInstruction ? (
                <Button
                  variant="adminPrimary"
                  onClick={() => sendPaymentInstruction('program')}
                  disabled={paymentActionSaving === 'send-program'}
                >
                  {paymentActionSaving === 'send-program' ? 'Sending...' : 'Send Program Fee Email'}
                </Button>
              ) : null}
              {canMarkProgramComplete ? (
                <Button
                  variant="adminSecondary"
                  className="text-white"
                  onClick={() => markPaymentComplete(latestProgramPayment, 'program')}
                  disabled={paymentActionSaving === 'complete-program'}
                >
                  {paymentActionSaving === 'complete-program' ? 'Saving...' : 'Mark Program Fee Completed'}
                </Button>
              ) : null}
              {canSendFinalInstruction ? (
                <Button
                  variant="adminPrimary"
                  onClick={() => sendPaymentInstruction('final')}
                  disabled={paymentActionSaving === 'send-final'}
                >
                  {paymentActionSaving === 'send-final' ? 'Sending...' : 'Send Final Payment Email'}
                </Button>
              ) : null}
              {canMarkFinalComplete ? (
                <Button
                  variant="adminSecondary"
                  className="text-white"
                  onClick={() => markPaymentComplete(latestFinalPayment, 'final')}
                  disabled={paymentActionSaving === 'complete-final'}
                >
                  {paymentActionSaving === 'complete-final' ? 'Saving...' : 'Mark Final Payment Completed'}
                </Button>
              ) : null}
              {latestReviewablePayment ? <Button variant="adminPrimary" onClick={() => setActiveReview({ type: 'payment', item: latestReviewablePayment })}>Review Latest Payment</Button> : null}
              {can('payments:verify') ? <Button variant="adminSecondary" className="text-white" onClick={openRefundModal}>Initiate Refund</Button> : null}
            </div>
          )}
        >
          {!payments.length ? <p className="text-sm text-slate-500">No payment records yet.</p> : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment._id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{humanize(payment.type)}</p>
                      <p className="text-sm text-slate-500">{payment.currency} {payment.amount} • {humanize(payment.status)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {payment.receiptUrl ? <a className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" href={`${getBackendBaseUrl()}${payment.receiptUrl}`} target="_blank" rel="noreferrer">Open Receipt</a> : null}
                      {canReviewPayment(payment) ? (
                        <Button
                          variant="adminSecondary"
                          className="text-white"
                          onClick={() => setActiveReview({ type: 'payment', item: payment })}
                        >
                          {String(payment.status || '').toLowerCase() === 'pending' ? 'Review' : 'Edit Review'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal isOpen={refundOpen} onClose={() => setRefundOpen(false)} title="Initiate Refund">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Select which payments to mark as refunded. Email 14 will be sent to the candidate only after you confirm.
          </div>

          <div className="space-y-2">
            {(payments || []).map((p) => {
              const status = String(p.status || '').toLowerCase();
              const canPick = ['completed', 'verified', 'paid'].includes(status) && status !== 'refunded';
              if (!refundSelection || refundSelection[p._id] === undefined) return null;
              return (
                <label key={p._id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${canPick ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                  <span className="text-sm font-semibold text-slate-900">{humanize(p.type)} — {p.currency} {p.amount} ({humanize(p.status)})</span>
                  <input
                    type="checkbox"
                    disabled={!canPick || refundSaving}
                    checked={Boolean(refundSelection[p._id])}
                    onChange={(e) => setRefundSelection((prev) => ({ ...prev, [p._id]: e.target.checked }))}
                  />
                </label>
              );
            })}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="refund-deduction">Administrative Deduction (USD)</label>
            <input
              id="refund-deduction"
              inputMode="numeric"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[rgba(200,169,107,0.5)]"
              value={refundDeduction}
              onChange={(e) => setRefundDeduction(e.target.value.replace(/[^\d.]/g, ''))}
              disabled={refundSaving}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="adminPrimary" onClick={submitRefund} disabled={refundSaving}>
              {refundSaving ? 'Sending...' : 'Confirm Refund Sent'}
            </Button>
            <Button variant="adminSecondary" className="text-white" onClick={() => setRefundOpen(false)} disabled={refundSaving}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {!loading && !error && candidate && activeTab === 'documents' && (
        <Card
          title="Documents"
          subtitle="Every document decision is audit logged."
          actions={latestReviewableDocument ? <Button variant="adminPrimary" onClick={() => setActiveReview({ type: 'document', item: latestReviewableDocument })}>Review Latest Document</Button> : null}
        >
          {can('documents:verify') && documents.length > 0 && !allDocumentsApproved ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="adminPrimary" onClick={() => applyBulkDocumentAction('Accepted')} disabled={documentBulkSaving}>
                  {documentBulkSaving ? 'Saving...' : 'Bulk Approve Selected'}
                </Button>
                <Button variant="danger" onClick={() => applyBulkDocumentAction('Needs Revision')} disabled={documentBulkSaving}>
                  {documentBulkSaving ? 'Saving...' : 'Request Reupload For Selected'}
                </Button>
                <span className="text-xs text-slate-500">Selected: {selectedDocuments.length}</span>
              </div>
              <textarea
                className="mt-2 min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[rgba(200,169,107,0.5)]"
                placeholder="Comment for candidate (required for reupload request)."
                value={documentBulkComment}
                onChange={(event) => setDocumentBulkComment(event.target.value)}
              />
            </div>
          ) : null}
          {showProgramPaymentPendingMessage ? (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              Program fee payment pending
            </div>
          ) : null}
          {!documents.length ? <p className="text-sm text-slate-500">No documents uploaded yet.</p> : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div key={document._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                  <div>
                    {can('documents:verify') && !allDocumentsApproved ? (
                      <label className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedDocumentIds[document._id])}
                          onChange={(event) => toggleDocumentSelection(document._id, event.target.checked)}
                        />
                        Select
                      </label>
                    ) : null}
                    <p className="font-semibold text-slate-900">{document.documentType}</p>
                    <p className="text-sm text-slate-500">{humanize(document.status)} • {formatDate(document.uploadedAt)}</p>
                    {document.adminComment ? <p className="mt-1 text-xs text-rose-700">Admin comment: {document.adminComment}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" href={`${getBackendBaseUrl()}${document.fileUrl}`} target="_blank" rel="noreferrer">Open File</a>
                    {canReviewDocument(document) && !allDocumentsApproved ? <Button variant="adminSecondary" className="text-white" onClick={() => setActiveReview({ type: 'document', item: document })}>Review</Button> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {!loading && !error && candidate && activeTab === 'hiring' && (
        <Card
          title="Hiring Partner Stage"
          subtitle="After document verification, assign the candidate to a hiring partner. Selection result is announced after this stage."
        >
          {!documentVerificationAccepted ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Document verification is not accepted yet. Complete document verification to unlock hiring assignment.
            </div>
          ) : (
            <div className="space-y-4">
              {hiringAccepted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Hiring partner is already assigned to <span className="font-semibold">{candidate?.assignedHiringPartner || 'the selected partner'}</span>.
                 
                </div>
              ) : null}

              <KeyValueGrid rows={[
                { label: 'Document Verification', value: documentVerificationAccepted ? 'Accepted' : 'Pending' },
                { label: 'Assigned Hiring Partner', value: candidate?.assignedHiringPartner || 'Not assigned' },
                { label: 'Hiring Stage Decision', value: humanize(hiringDecision || 'pending') },
              ]} />

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="hiring-partner">Hiring Partner Name</label>
                  <input
                    id="hiring-partner"
                    list="hiring-partner-options"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[rgba(200,169,107,0.5)]"
                    value={hiringPartnerDraft}
                    onChange={(event) => setHiringPartnerDraft(event.target.value)}
                    placeholder="Enter hiring partner name"
                  />
                  <datalist id="hiring-partner-options">
                    {hiringPartnerOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="adminPrimary" onClick={() => submitHiringDecision('accepted')} disabled={!can('candidates:update') || stageSaving === 'hiring'}>
                  {stageSaving === 'hiring' ? 'Saving...' : hiringAccepted ? 'Update Assignment' : 'Send To Hiring Partner'}
                </Button>
                {!hiringAccepted ? (
                  <Button variant="adminSecondary" onClick={() => submitHiringDecision('under_review')} disabled={!can('candidates:update') || stageSaving === 'hiring'} className="text-white">
                    Keep Under Review
                  </Button>
                ) : null}
              </div>

              {String(role || '') === 'operations_admin' && (currentStageKey === 'operations_approval' || (String(candidate?.evaluationStatus || '').toLowerCase() === 'approved' && String(candidate?.operationsStatus || '').toLowerCase() === 'pending')) ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">Operations Admin Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="adminPrimary" onClick={submitOperationsApproval} disabled={Boolean(operationsSaving)}>
                      {operationsSaving === 'approved' ? 'Saving...' : 'Approve Candidate'}
                    </Button>
                    <Button variant="adminSecondary" className="text-white" onClick={submitOperationsRejection} disabled={Boolean(operationsSaving)}>
                      {operationsSaving === 'rejected' ? 'Saving...' : 'Reject Candidate'}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">This decision is only available after evaluation approval and before account creation.</p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[rgba(200,169,107,0.5)]"
                      placeholder="Interview Role"
                      value={interviewDraft.role}
                      onChange={(event) => setInterviewDraft((prev) => ({ ...prev, role: event.target.value }))}
                    />
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[rgba(200,169,107,0.5)]"
                      placeholder="Country"
                      value={interviewDraft.country}
                      onChange={(event) => setInterviewDraft((prev) => ({ ...prev, country: event.target.value }))}
                    />
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[rgba(200,169,107,0.5)]"
                      value={interviewDraft.date}
                      onChange={(event) => setInterviewDraft((prev) => ({ ...prev, date: event.target.value }))}
                    />
                    <input
                      type="time"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[rgba(200,169,107,0.5)]"
                      value={interviewDraft.time}
                      onChange={(event) => setInterviewDraft((prev) => ({ ...prev, time: event.target.value }))}
                    />
                    <input
                      className="md:col-span-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[rgba(200,169,107,0.5)]"
                      placeholder="Meeting Link (optional)"
                      value={interviewDraft.meetingLink}
                      onChange={(event) => setInterviewDraft((prev) => ({ ...prev, meetingLink: event.target.value }))}
                    />
                  </div>

                  <div>
                    <Button variant="adminPrimary" onClick={submitInterviewSchedule} disabled={operationsSaving === 'schedule_interview'}>
                      {operationsSaving === 'schedule_interview' ? 'Scheduling...' : 'Schedule Interview'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      )}

      {!loading && !error && candidate && activeTab === 'selection' && (
        <Card title="Selection Results" subtitle="After hiring partner assignment, announce final selection result directly from this stage.">
          {!hiringAccepted ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Complete hiring partner assignment first. Selection announcement is enabled immediately after hiring is completed.
            </div>
          ) : (
            <div className="space-y-4">
              <KeyValueGrid rows={[
                { label: 'Hiring Stage', value: hiringAccepted ? 'Completed' : 'Pending' },
                { label: 'Assigned Hiring Partner', value: candidate?.assignedHiringPartner || 'Not assigned' },
                { label: 'Selection Status', value: humanize(progress?.selectionStatus) },
                { label: 'Current Stage', value: progress?.currentStage || '—' },
              ]} />

              <div className="flex flex-wrap gap-2">
                {canReviewSelection ? (
                  <Button variant="adminSecondary" className="text-white" onClick={() => setActiveReview({ type: 'selection' })}>
                    {selectionAnnounced ? 'Edit Announced Result' : 'Announce Result'}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      )}

      {!loading && !error && candidate && activeTab === 'notes' && (
        <Card title="Admin Notes" subtitle="Operational notes are separate from approval reasons and are not used as approval justification.">
          <textarea
            className="min-h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
            value={notesDraft}
            onChange={(event) => setNotesDraft(event.target.value)}
            disabled={!can('notes:manage')}
          />
          <div className="mt-3 flex justify-end">
            <Button variant="adminPrimary" onClick={saveNotes} disabled={notesSaving || !can('notes:manage')}>
              {notesSaving ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>

          {canViewAuditHistory ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">Saved Notes History</h3>
              <p className="mt-1 text-xs text-slate-500">Version-wise record of who saved notes, when, and what content was saved.</p>
              <div className="mt-3">
                <AuditHistoryPanel history={notesHistory} emptyMessage="No notes history yet." />
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {!loading && !error && candidate && activeTab === 'history' && canViewAuditHistory && (
        <Card title="Approval History" subtitle="Complete approval and status history shown according to your audit permissions.">
          <AuditHistoryPanel history={approvalHistory} />
        </Card>
      )}

      <ApprovalReviewModal
        isOpen={Boolean(reviewConfig) && activeReview?.type !== 'profile'}
        onClose={closeReview}
        title={reviewConfig?.title}
        candidate={candidate}
        currentStage={reviewConfig?.currentStage}
        currentStatus={reviewConfig?.currentStatus}
        summaryRows={reviewConfig?.summaryRows || []}
        evidenceItems={reviewConfig?.evidenceItems || []}
        history={canViewAuditHistory ? reviewConfig?.history || [] : []}
        decisionOptions={reviewConfig?.decisionOptions || []}
        onSubmit={submitReview}
      />
    </section>
  );
}
