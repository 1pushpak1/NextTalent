import AdminCandidatesPage from './AdminCandidatesPage';

const INTERVIEW_FILTERS = Object.freeze({ stage: 'hiring', pendingFrom: 'admin' });

export default function AdminOperationsInterviewsPage() {
  return (
    <AdminCandidatesPage
      pageTitle="Interview Candidates"
      pageSubtitle="Operations Admin list for scheduling candidate interviews."
      forcedFilters={INTERVIEW_FILTERS}
    />
  );
}
