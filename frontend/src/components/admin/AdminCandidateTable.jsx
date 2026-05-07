import { useNavigate } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const stageReviewMap = {
  evaluation: 'profile',
  'document-verification': 'documents',
  interviews: 'interviews',
  selection: 'selection',
  hiring: 'hiring',
  testimonials: 'history',
};

export default function AdminCandidateTable({ rows = [], loading = false, stageKey = '' }) {
  const navigate = useNavigate();
  const { can } = usePermissions();

  if (loading) return <p className="text-sm text-slate-500">Loading applications...</p>;
  if (!rows.length) return <p className="text-sm text-slate-500">No applications found for this stage.</p>;

  const canReviewStage =
    (stageKey === 'evaluation' && can('evaluation:approve')) ||
    (stageKey === 'document-verification' && can('documents:verify')) ||
    (stageKey === 'selection' && can('candidates:update')) ||
    (stageKey === 'interviews' && can('interviews:manage')) ||
    (stageKey === 'hiring' && can('candidates:update'));

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Pipeline Status</th>
              <th className="px-4 py-3">Latest Activity</th>
              <th className="px-4 py-3">Review Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{row.name || '—'}</p>
                  <p className="text-xs text-slate-500">{row.email || '—'}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.currentStage || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{row.status || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{formatDate(row.date)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      onClick={() => navigate(`/admin/candidates/${row._id}?tab=${stageReviewMap[stageKey] || 'overview'}${canReviewStage ? `&review=${stageKey}` : ''}`)}
                    >
                      {canReviewStage ? 'Review & Decide' : 'Open Candidate'}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                      onClick={() => navigate(`/admin/candidates/${row._id}`)}
                    >
                      View Profile
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
