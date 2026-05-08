import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import ApprovalReviewModal from '../../components/admin/ApprovalReviewModal';
import AuditHistoryPanel from '../../components/admin/AuditHistoryPanel';
import Button from '../../components/Button';
import {
  fetchAdminCandidateProfile,
  reviewCandidateDocument,
  reviewCandidateProfile,
  reviewCandidateStage,
  reviewPayment,
  updateCandidateNotes,
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
        <p className="mt-1 break-words text-sm font-medium text-slate-800">{row.value || '—'}</p>
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
  const location = useLocation();
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
  const [hiringPartnerDraft, setHiringPartnerDraft] = useState('');
  const [stageSaving, setStageSaving] = useState('');

  const currentParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const canViewAuditHistory = String(role || '') === 'super_admin';
  const visibleTabs = useMemo(
    () => (canViewAuditHistory ? tabs : tabs.filter((tab) => tab !== 'history')),
    [canViewAuditHistory],
  );
  const activeTabParam = currentParams.get('tab');
  const tabFromUrl = visibleTabs.includes(activeTabParam) ? activeTabParam : 'overview';
  const [activeTab, setActiveTabState] = useState(tabFromUrl);
  const reviewParam = currentParams.get('review');
  const canReviewSelection = ['super_admin', 'payment_admin'].includes(String(role || ''));

  useEffect(() => {
    setActiveTabState(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTabState('overview');
      const next = new URLSearchParams(currentParams);
      next.set('tab', 'overview');
      next.delete('review');
      setSearchParams(next);
    }
  }, [activeTab, currentParams, setSearchParams, visibleTabs]);

  // Auto-scroll to top when tab changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeTab]);
  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [id]);

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

  const filteredHistory = (types) => approvalHistory.filter((item) => types.includes(item.approvalType));
  const isInlineProfileReview = activeTab === 'profile' && reviewParam === 'evaluation' && Boolean(profile) && can('evaluation:approve');
  const profileReviewHistory = filteredHistory(['profile_evaluation']);
  const lastProfileReview = profileReviewHistory[0] || null;
  const profileAlreadyReviewed = profile?.status === 'accepted' || profile?.status === 'rejected';
  const profileDecisionState = normalizeProfileDecision(profile?.status, lastProfileReview?.decision);
  const notesHistory = filteredHistory(['admin_notes']);

  useEffect(() => {
    if (!candidate) return;
    const assigned = String(candidate.assignedHiringPartner || '').trim();
    if (assigned && !hiringPartnerDraft) {
      setHiringPartnerDraft(assigned);
    }
  }, [candidate, hiringPartnerDraft]);

  useEffect(() => {
    if (!data) return;
    const review = currentParams.get('review');
    if (!review) return;

    if (review === 'document-verification' && documents[0] && can('documents:verify')) {
      setActiveReview({ type: 'document', item: documents[0] });
      return;
    }
    if (review === 'selection' && canReviewSelection) {
      setActiveReview({ type: 'selection' });
      return;
    }
    setActiveReview(null);
  }, [data, currentParams, documents, can, canReviewSelection]);

  useEffect(() => {
    if (!isInlineProfileReview) {
      setProfileReviewNote('');
      setProfileReviewConfirmed(false);
      setProfileReviewSubmitting('');
    }
  }, [isInlineProfileReview]);

  const setTab = (tab) => {
    setActiveTabState(tab);
    const next = new URLSearchParams(currentParams);
    next.set('tab', tab);
    next.delete('review');
    setSearchParams(next);
  };

  const openProfileReview = () => {
    const next = new URLSearchParams(currentParams);
    next.set('tab', 'profile');
    next.set('review', 'evaluation');
    setSearchParams(next);
  };

  const closeReview = () => {
    setActiveReview(null);
    const next = new URLSearchParams(currentParams);
    next.delete('review');
    setSearchParams(next);
  };

  const stageIndex = stageSequence.indexOf(progress?.currentStageKey);
  const allStagesCompleted = String(progress?.currentStageKey || '').toLowerCase() === 'completed';

  const profileRows = useMemo(() => {
    if (!profile) return [];
    return [
      { label: 'Candidate Name', value: candidate?.name || candidate?.email },
      { label: 'Profile Status', value: humanize(profile.status) },
      { label: 'Email Verified', value: candidate?.emailVerified ? 'Yes' : 'No' },
      { label: 'Phone Verified', value: candidate?.phoneVerified ? 'Yes' : 'No' },
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
          activeReview.item?.receiptUrl
            ? {
                key: `payment-${activeReview.item?._id}`,
                label: 'Open uploaded payment proof',
                description: 'Review the uploaded receipt or payment screenshot.',
                href: `${getBackendBaseUrl()}${activeReview.item?.receiptUrl}`,
                buttonLabel: 'Open Receipt',
              }
            : {
                key: `payment-summary-${activeReview.item?._id}`,
                label: 'Open payment record summary',
                description: 'No receipt is uploaded. Review the payment details before deciding.',
                onOpen: () => window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(activeReview.item, null, 2))}`, '_blank', 'noopener,noreferrer'),
                buttonLabel: 'Open Summary',
              },
        ],
        history: filteredHistory(['payment_verification']).filter((item) => item.sectionRecordId === String(activeReview.item?._id)),
        decisionOptions: [
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
        evidenceItems: [
          {
            key: 'selection-summary',
            label: 'Open stage summary',
            description: 'Review hiring assignment and current candidate progress before announcing result.',
            onOpen: () => window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify({ candidate, progress }, null, 2))}`, '_blank', 'noopener,noreferrer'),
            buttonLabel: 'Open Summary',
          },
        ],
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
  const latestPendingReviewPayment = payments.find((payment) => {
    const status = String(payment?.status || '').toLowerCase();
    return canReviewPayment(payment) && status === 'pending';
  }) || latestReviewablePayment;
  const canReviewDocument = (document) => {
    if (!can('documents:verify') || !document) return false;
    const status = String(document.status || '').toLowerCase();
    return status !== 'accepted';
  };
  const latestReviewableDocument = documents.find((document) => canReviewDocument(document)) || null;

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

    if (can('evaluation:approve') && profile && currentStageKey === 'profile_review') {
      return {
        ...base,
        buttonLabel: profileAlreadyReviewed ? 'Edit Response' : 'Review Internal Evaluation',
        onClick: openProfileReview,
        helperText: 'Profile review is the current required admin action.',
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
    can,
    profile,
    profileAlreadyReviewed,
    openProfileReview,
    canReviewSelection,
    hiringAccepted,
    latestPendingReviewPayment,
    latestReviewableDocument,
  ]);

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
                <Button variant="adminSecondary" onClick={openProfilePdf} className="px-3 py-2 text-xs">
                  Open Profile
                </Button>
              ) : null}
              {profile ? (
                <Button variant="adminSecondary" onClick={exportProfile} className="px-3 py-2 text-xs">
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
              activeTab === tab ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setTab(tab)}
          >
            {humanize(tab)}
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
                  <Button variant="adminSecondary" onClick={() => submitInlineProfileReview('under_review')} disabled={!profileReviewNote.trim() || !profileReviewConfirmed || Boolean(profileReviewSubmitting)}>
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
                  <Button variant="adminSecondary" onClick={openProfilePdf} className="px-3 py-2 text-xs">
                    Open Profile
                  </Button>
                ) : null}
                {profile ? (
                  <Button variant="adminSecondary" onClick={exportProfile} className="px-3 py-2 text-xs">
                    Export Profile
                  </Button>
                ) : null}
                {can('evaluation:approve') && profile ? (
                  profileAlreadyReviewed && lastProfileReview ? (
                    <>
                      <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        profileDecisionState === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        profileDecisionState === 'rejected' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {profileDecisionState === 'approved' ? '✓ Profile Approved' :
                         profileDecisionState === 'rejected' ? '✗ Profile Rejected' :
                         '— Under Review'}
                      </div>
                      <Button variant="adminSecondary" onClick={openProfileReview} className="px-3 py-2 text-xs">Edit Response</Button>
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
          subtitle="Review receipts and bank references before verifying."
          actions={latestReviewablePayment ? <Button variant="adminPrimary" onClick={() => setActiveReview({ type: 'payment', item: latestReviewablePayment })}>Review Latest Payment</Button> : null}
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
                        <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'payment', item: payment })}>
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

      {!loading && !error && candidate && activeTab === 'documents' && (
        <Card
          title="Documents"
          subtitle="Every document decision is audit logged."
          actions={latestReviewableDocument ? <Button variant="adminPrimary" onClick={() => setActiveReview({ type: 'document', item: latestReviewableDocument })}>Review Latest Document</Button> : null}
        >
          {!documents.length ? <p className="text-sm text-slate-500">No documents uploaded yet.</p> : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div key={document._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{document.documentType}</p>
                    <p className="text-sm text-slate-500">{humanize(document.status)} • {formatDate(document.uploadedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100" href={`${getBackendBaseUrl()}${document.fileUrl}`} target="_blank" rel="noreferrer">Open File</a>
                    {canReviewDocument(document) ? <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'document', item: document })}>Review</Button> : null}
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
                  <Button variant="adminSecondary" onClick={() => submitHiringDecision('under_review')} disabled={!can('candidates:update') || stageSaving === 'hiring'}>
                    Keep Under Review
                  </Button>
                ) : null}
              </div>
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
                  <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'selection' })}>
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
