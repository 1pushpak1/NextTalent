import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import ApprovalReviewModal from '../../components/admin/ApprovalReviewModal';
import AuditHistoryPanel from '../../components/admin/AuditHistoryPanel';
import Button from '../../components/Button';
import {
  fetchAdminCandidateProfile,
  reviewCandidateDocument,
  reviewCandidateProfile,
  reviewCandidateStage,
  reviewPayment,
  scheduleCandidateInterview,
  updateCandidateNotes,
} from '../../api/adminApi';
import usePermissions from '../../hooks/usePermissions';

const tabs = ['overview', 'profile', 'eligibility', 'payments', 'documents', 'hiring', 'interviews', 'notes', 'history'];

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
  'interviews',
  'selection',
  'final_payment',
  'testimonial',
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
  const [interviewForm, setInterviewForm] = useState({
    hiringPartner: '',
    country: '',
    role: '',
    date: '',
    time: '',
    meetingLink: '',
  });

  const currentParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const activeTabParam = currentParams.get('tab');
  const tabFromUrl = tabs.includes(activeTabParam) ? activeTabParam : 'overview';
  const [activeTab, setActiveTabState] = useState(tabFromUrl);
  const reviewParam = currentParams.get('review');
  const canReviewSelection = ['super_admin', 'payment_admin'].includes(String(role || ''));

  useEffect(() => {
    setActiveTabState(tabFromUrl);
  }, [tabFromUrl]);

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
  const interviews = data?.interviews || [];
  const progress = data?.progress;
  const approvalHistory = data?.approvalHistory || [];
  const latestInterview = interviews[0] || null;
  const documentVerificationDecision = readStageDecision(candidate, 'document-verification');
  const hiringDecision = readStageDecision(candidate, 'hiring');
  const interviewDecision = readStageDecision(candidate, 'interviews');
  const documentVerificationAccepted = documentVerificationDecision === 'accepted' || progress?.documentStatus === 'verified';
  const hiringAccepted = hiringDecision === 'accepted' || Boolean(candidate?.assignedHiringPartner);
  const interviewCompleted =
    String(latestInterview?.status || '').toLowerCase() === 'completed' ||
    interviewDecision === 'accepted' ||
    String(candidate?.status || '').toLowerCase() === 'interview_completed' ||
    String(progress?.interviewStatus || '').toLowerCase() === 'completed';

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
    if (assigned && !interviewForm.hiringPartner) {
      setInterviewForm((prev) => ({ ...prev, hiringPartner: assigned }));
    }
  }, [candidate, hiringPartnerDraft, interviewForm.hiringPartner]);

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
      const markLatestInterviewCompleted = async () => {
        setStageSaving('interviews-complete');
        setError('');
        try {
          await reviewCandidateStage(id, 'interviews', {
            status: 'accepted',
            reasonNote: 'Interview completed by admin',
            sourcePage: '/admin/candidates/interviews',
          });
          await load();
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to mark interview completed');
        } finally {
          setStageSaving('');
        }
      };

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

  const submitInterviewSchedule = async () => {
    if (!interviewForm.hiringPartner.trim() || !interviewForm.country.trim() || !interviewForm.role.trim() || !interviewForm.date.trim() || !interviewForm.time.trim()) {
      setError('Please fill hiring partner, country, role, date, and time to schedule interview.');
      return;
    }

    setStageSaving('interviews');
    setError('');
    try {
      await scheduleCandidateInterview(id, {
        hiringPartner: interviewForm.hiringPartner.trim(),
        country: interviewForm.country.trim(),
        role: interviewForm.role.trim(),
        date: interviewForm.date.trim(),
        time: interviewForm.time.trim(),
        meetingLink: interviewForm.meetingLink.trim(),
      });
      setInterviewForm({
        hiringPartner: interviewForm.hiringPartner.trim(),
        country: '',
        role: '',
        date: '',
        time: '',
        meetingLink: '',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule interview');
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
      const latestInterview = interviews[0];
      return {
        title: 'Final Selection Review',
        currentStage: 'Selection Result',
        currentStatus: progress?.selectionStatus,
        summaryRows: [
          { label: 'Current Selection Status', value: humanize(progress?.selectionStatus) },
          { label: 'Latest Interview Role', value: latestInterview?.role || '—' },
          { label: 'Latest Interview Status', value: latestInterview?.status || '—' },
          { label: 'Hiring Partner', value: latestInterview?.hiringPartner || candidate?.assignedHiringPartner || '—' },
        ],
        evidenceItems: [
          {
            key: 'selection-summary',
            label: 'Open interview summary',
            description: 'Review the latest interview details and current candidate progress.',
            onOpen: () => window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify({ interviews, progress }, null, 2))}`, '_blank', 'noopener,noreferrer'),
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

  return (
    <section ref={contentRef} className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(200,169,107,0.18),_transparent_28%),linear-gradient(135deg,#0f172a,#1e293b)] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-blue-200/85">Admin Review Workspace</p>
            <h1 className="mt-2 text-3xl font-bold">{candidate?.name || candidate?.email || 'Candidate Review'}</h1>
            <p className="mt-2 text-sm text-slate-300">{candidate?.email || '—'} {candidate?.phone ? `• ${candidate.phone}` : ''}</p>
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
                index < stageIndex ? 'bg-emerald-500/20 text-emerald-100' :
                index === stageIndex ? 'bg-blue-500 text-white' :
                'bg-white/5 text-slate-400'
              }`}
            >
              {humanize(stage)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
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
              {can('evaluation:approve') && profile ? (
                profileAlreadyReviewed && lastProfileReview ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      profileDecisionState === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      profileDecisionState === 'rejected' ? 'bg-rose-50 text-rose-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {profileDecisionState === 'approved' ? '✓ Internal Evaluation - Approved' :
                       profileDecisionState === 'rejected' ? '✗ Internal Evaluation - Rejected' :
                       '— Internal Evaluation - Under Review'}
                    </div>
                    {lastProfileReview.reasonNote && (
                      <p className="text-xs text-slate-600"><span className="font-semibold">Reason:</span> {lastProfileReview.reasonNote}</p>
                    )}
                    <Button variant="adminSecondary" onClick={openProfileReview} className="px-3 py-2 text-xs">Edit Response</Button>
                  </div>
                ) : (
                  <Button variant="adminPrimary" onClick={openProfileReview}>Review Internal Evaluation</Button>
                )
              ) : null}
              {can('documents:verify') && documents[0] ? <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'document', item: documents[0] })}>Review Latest Document</Button> : null}
              {can('payments:verify') && payments[0] ? <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'payment', item: payments[0] })}>Review Latest Payment</Button> : null}
              {canReviewSelection && interviewCompleted ? <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'selection' })}>Review Final Selection</Button> : null}
              {canReviewSelection && !interviewCompleted ? (
                <p className="text-xs text-amber-700">Selection can be announced only after interview is marked completed.</p>
              ) : null}
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
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{candidate?.name || candidate?.email}</p>
                  <p className="mt-1 text-sm text-slate-600">{candidate?.email || '—'}</p>
                  <p className="mt-3 text-sm text-slate-700">This page is the full internal evaluation workspace. Review the submitted profile below, add a reason, then record your decision.</p>
                </div>

                <KeyValueGrid rows={profileRows} />

                <div>
                  <label className="block text-sm font-medium text-slate-900" htmlFor="profile-review-note">Decision Reason / Note</label>
                  <textarea
                    id="profile-review-note"
                    className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
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

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Previous Approval History</h3>
                  <div className="mt-3">
                    <AuditHistoryPanel history={filteredHistory(['profile_evaluation'])} />
                  </div>
                </div>

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
              can('evaluation:approve') && profile ? (
                profileAlreadyReviewed && lastProfileReview ? (
                  <div className="flex flex-col items-end gap-2">
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
                  </div>
                ) : (
                  <Button variant="adminPrimary" onClick={openProfileReview}>{isInlineProfileReview ? 'Review In Progress' : 'Review & Decide'}</Button>
                )
              ) : null
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
        <Card title="Payments" subtitle="Review receipts and bank references before verifying." actions={can('payments:verify') && payments[0] ? <Button variant="adminPrimary" onClick={() => setActiveReview({ type: 'payment', item: payments[0] })}>Review Latest Payment</Button> : null}>
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
                      {can('payments:verify') ? <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'payment', item: payment })}>Review</Button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {!loading && !error && candidate && activeTab === 'documents' && (
        <Card title="Documents" subtitle="Every document decision is audit logged." actions={can('documents:verify') && documents[0] ? <Button variant="adminPrimary" onClick={() => setActiveReview({ type: 'document', item: documents[0] })}>Review Latest Document</Button> : null}>
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
                    {can('documents:verify') ? <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'document', item: document })}>Review</Button> : null}
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
          subtitle="After document verification, assign the candidate to a hiring partner before interview scheduling."
        >
          {!documentVerificationAccepted ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Document verification is not accepted yet. Complete document verification to unlock hiring assignment.
            </div>
          ) : (
            <div className="space-y-4">
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
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    value={hiringPartnerDraft}
                    onChange={(event) => setHiringPartnerDraft(event.target.value)}
                    placeholder="Enter hiring partner name"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="adminPrimary" onClick={() => submitHiringDecision('accepted')} disabled={!can('candidates:update') || stageSaving === 'hiring'}>
                  {stageSaving === 'hiring' ? 'Saving...' : 'Send To Hiring Partner'}
                </Button>
                <Button variant="adminSecondary" onClick={() => submitHiringDecision('under_review')} disabled={!can('candidates:update') || stageSaving === 'hiring'}>
                  Keep Under Review
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!loading && !error && candidate && activeTab === 'interviews' && (
        <Card title="Interviews and Selection" subtitle="Schedule interviews after hiring assignment, then publish final selection." actions={canReviewSelection && interviewCompleted ? <Button variant="adminPrimary" onClick={() => setActiveReview({ type: 'selection' })}>Announce Result</Button> : null}>
          {!hiringAccepted ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Assign and approve hiring partner first, then interview scheduling will be enabled.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interview-hiring-partner">Hiring Partner</label>
                  <input
                    id="interview-hiring-partner"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    value={interviewForm.hiringPartner}
                    onChange={(event) => setInterviewForm((prev) => ({ ...prev, hiringPartner: event.target.value }))}
                    placeholder="Hiring partner"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interview-country">Country</label>
                  <input
                    id="interview-country"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    value={interviewForm.country}
                    onChange={(event) => setInterviewForm((prev) => ({ ...prev, country: event.target.value }))}
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interview-role">Role</label>
                  <input
                    id="interview-role"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    value={interviewForm.role}
                    onChange={(event) => setInterviewForm((prev) => ({ ...prev, role: event.target.value }))}
                    placeholder="Interview role"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interview-date">Date</label>
                  <input
                    id="interview-date"
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    value={interviewForm.date}
                    onChange={(event) => setInterviewForm((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interview-time">Time</label>
                  <input
                    id="interview-time"
                    type="time"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    value={interviewForm.time}
                    onChange={(event) => setInterviewForm((prev) => ({ ...prev, time: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="interview-meeting-link">Meeting Link</label>
                  <input
                    id="interview-meeting-link"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    value={interviewForm.meetingLink}
                    onChange={(event) => setInterviewForm((prev) => ({ ...prev, meetingLink: event.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="adminPrimary" onClick={submitInterviewSchedule} disabled={!can('interviews:manage') || stageSaving === 'interviews'}>
                  {stageSaving === 'interviews' ? 'Scheduling...' : 'Schedule Interview'}
                </Button>
                <Button variant="adminSecondary" onClick={markLatestInterviewCompleted} disabled={!can('candidates:update') || !interviews.length || stageSaving === 'interviews-complete'}>
                  {stageSaving === 'interviews-complete' ? 'Saving...' : 'Mark Interview Completed'}
                </Button>
                {canReviewSelection && interviewCompleted ? <Button variant="adminSecondary" onClick={() => setActiveReview({ type: 'selection' })}>Announce Result</Button> : null}
              </div>

              {canReviewSelection && !interviewCompleted ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Mark interview as completed to enable result announcement.
                </div>
              ) : null}

              {!interviews.length ? <p className="text-sm text-slate-500">No interviews scheduled yet.</p> : (
                <div className="space-y-3">
                  {interviews.map((interview) => (
                    <div key={interview._id} className="rounded-2xl border border-slate-200 p-4">
                      <KeyValueGrid rows={[
                        { label: 'Role', value: interview.role },
                        { label: 'Hiring Partner', value: interview.hiringPartner },
                        { label: 'Country', value: interview.country },
                        { label: 'Date', value: interview.date },
                        { label: 'Time', value: interview.time },
                        { label: 'Status', value: interview.status },
                      ]} />
                    </div>
                  ))}
                </div>
              )}
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

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Saved Notes History</h3>
            <p className="mt-1 text-xs text-slate-500">Version-wise record of who saved notes, when, and what content was saved.</p>
            <div className="mt-3">
              <AuditHistoryPanel history={notesHistory} emptyMessage="No notes history yet." />
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && candidate && activeTab === 'history' && (
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
        history={reviewConfig?.history || []}
        decisionOptions={reviewConfig?.decisionOptions || []}
        onSubmit={submitReview}
      />
    </section>
  );
}
