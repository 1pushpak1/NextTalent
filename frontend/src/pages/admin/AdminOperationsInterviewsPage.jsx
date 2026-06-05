import AdminCandidatesPage from './AdminCandidatesPage';
import { getAdminDisplayName } from '../../utils/adminDisplay';

const INTERVIEW_FILTERS = Object.freeze({ stage: 'hiring', pendingFrom: 'admin' });

export default function AdminOperationsInterviewsPage() {
  return (
    <AdminCandidatesPage
      pageTitle="Interview Candidates"
      pageSubtitle={`${getAdminDisplayName('operations_admin')} list for scheduling candidate interviews.`}
      forcedFilters={INTERVIEW_FILTERS}
    />
  );
}
