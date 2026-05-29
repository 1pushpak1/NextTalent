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
  selection: 'selection',
  hiring: 'hiring',
  testimonials: 'history',
};

export default function AdminCandidateTable({ rows = [], loading = false, stageKey = '' }) {
  const navigate = useNavigate();
  const { can } = usePermissions();

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgba(200,169,107,0.24)] bg-[rgba(255,255,255,0.04)] p-5 text-sm text-[#bdbdc3]">
        Loading applications...
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-[rgba(200,169,107,0.24)] bg-[rgba(255,255,255,0.04)] p-5 text-center">
        <p className="text-base font-semibold text-[#f7f3ea]">No applications found for this stage.</p>
        <p className="mt-1 text-sm text-[#bdbdc3]">Try switching queue filters or check back after new updates.</p>
      </div>
    );
  }

  const canReviewStage =
    (stageKey === 'evaluation' && can('evaluation:approve')) ||
    (stageKey === 'document-verification' && can('documents:verify')) ||
    (stageKey === 'selection' && can('candidates:update')) ||
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
              <tr key={row._id} className="group border-t border-slate-100 transition hover:bg-slate-50/80">
                <td className="px-4 py-3 group-hover:text-black">
                  <p className="font-semibold text-slate-900 group-hover:text-black">{row.name || '—'}</p>
                  <p className="text-xs text-slate-500 group-hover:text-black">{row.email || '—'}</p>
                </td>
                <td className="px-4 py-3 text-slate-700 group-hover:text-black">{row.currentStage || '—'}</td>
                <td className="px-4 py-3 text-slate-700 group-hover:text-black">
                  <div className="flex flex-col gap-1">
                    <span>{row.status || '—'}</span>
                    {stageKey === 'evaluation' && row.admin2EvaluationApproved && !row.admin3EvaluationApproved ? (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Admin 2 Approved · Awaiting Admin 3</span>
                    ) : null}
                    {stageKey === 'evaluation' && !row.admin2EvaluationApproved ? (
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Pending Admin 2 Review</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700 group-hover:text-black">{formatDate(row.date)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[rgba(200,169,107,0.36)] px-3 py-2 text-xs font-semibold text-[#f7f3ea] transition hover:bg-[rgba(200,169,107,0.12)] group-hover:text-black"
                      onClick={() => navigate(`/admin/candidates/${row._id}?tab=${stageReviewMap[stageKey] || 'overview'}${canReviewStage ? `&review=${stageKey}` : ''}`)}
                    >
                      {canReviewStage ? (String(row.stepStatus || '').toLowerCase() === 'accepted' ? 'Edit Response' : 'Review & Decide') : 'Open Candidate'}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl border border-[rgba(200,169,107,0.28)] px-3 py-2 text-xs font-semibold text-[#d7c08a] transition hover:bg-[rgba(200,169,107,0.1)] group-hover:text-black"
                      onClick={() => navigate(`/admin/candidates/${row._id}`)}
                    >
                      View Profile
                      <span className="material-symbols-outlined text-sm leading-none group-hover:text-black">arrow_forward</span>
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
