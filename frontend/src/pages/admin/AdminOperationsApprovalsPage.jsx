import AdminCandidatesPage from './AdminCandidatesPage';

const APPROVALS_FILTERS = Object.freeze({ stage: 'hiring', pendingFrom: 'admin' });

export default function AdminOperationsApprovalsPage() {
  return (
    <AdminCandidatesPage
      pageTitle="Approve / Reject Candidates"
      pageSubtitle="Operations Admin queue for internal Admin-3 profile decisions."
      forcedFilters={APPROVALS_FILTERS}
    />
  );
}
