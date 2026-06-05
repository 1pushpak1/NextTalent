import AdminCandidatesPage from './AdminCandidatesPage';
import { getAdminDisplayName } from '../../utils/adminDisplay';

const APPROVALS_FILTERS = Object.freeze({ stage: 'operations_approval', pendingFrom: 'admin' });

export default function AdminOperationsApprovalsPage() {
  return (
    <AdminCandidatesPage
      pageTitle="Approve / Reject Candidates"
      pageSubtitle={`${getAdminDisplayName('operations_admin')} queue for internal profile decisions.`}
      forcedFilters={APPROVALS_FILTERS}
    />
  );
}
