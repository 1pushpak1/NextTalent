import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminDashboardSummary } from '../../api/adminApi';
import usePermissions from '../../hooks/usePermissions';

const cardConfig = [
  { key: 'totalApplications', label: 'Total Candidates', to: '/admin/candidates', requiredPermission: 'candidates:read' },
  { key: 'awaitingEvaluationApproval', label: 'Awaiting Evaluation Approval', to: '/admin/candidates?stage=profile_review&pendingFrom=admin', requiredPermission: 'evaluation:approve' },
  { key: 'awaitingOperationsApproval', label: 'Awaiting Operations Approval', to: '/admin/candidates?stage=operations_approval&pendingFrom=admin', requiredPermission: 'operations:approve' },
  { key: 'awaitingAccountCreation', label: 'Awaiting Account Creation', to: '/admin/candidates?stage=selection', requiredPermission: 'selection:publish' },
  { key: 'awaiting500Payment', label: 'Awaiting $500 Payment', to: '/admin/candidates?stage=selection', requiredPermission: 'payments:verify' },
  { key: 'awaitingDocumentUpload', label: 'Awaiting Document Upload', to: '/admin/candidates?stage=document_upload', requiredPermission: 'documents:verify' },
  { key: 'awaitingProgramFeeVerification', label: 'Awaiting First Installment', to: '/admin/candidates?stage=program_payment', requiredPermission: 'payments:verify' },
  { key: 'awaitingDocumentVerification', label: 'Awaiting Document Verification', to: '/admin/candidates?stage=document_verification', requiredPermission: 'documents:verify' },
  { key: 'assignedToHiringPartner', label: 'Assigned to Hiring Partner', to: '/admin/candidates?stage=hiring', requiredPermission: 'candidates:update' },
  { key: 'selectedCandidates', label: 'Selected Candidates', to: '/admin/candidates?selectionStatus=selected', requiredPermission: 'selection:publish' },
  { key: 'rejectedCandidates', label: 'Declined Candidates', to: '/admin/candidates?selectionStatus=rejected', requiredPermission: 'selection:publish' },
  { key: 'finalPaymentPending', label: 'Awaiting Final Installment', to: '/admin/candidates?paymentStatus=pending', requiredPermission: 'payments:verify' },
  { key: 'completedCandidates', label: 'Completed Candidates', to: '/admin/candidates?selectionStatus=selected', requiredPermission: 'candidates:read' },
  { key: 'totalRevenue', label: 'Total Revenue', requiredPermission: 'payments:verify' },
];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { can, role } = usePermissions();
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const [summary, setSummary] = useState({
    cards: {
      totalApplications: 0,
      awaitingEvaluationApproval: 0,
      awaitingOperationsApproval: 0,
      awaitingAccountCreation: 0,
      awaiting500Payment: 0,
      awaitingDocumentUpload: 0,
      awaitingProgramFeeVerification: 0,
      awaitingDocumentVerification: 0,
      assignedToHiringPartner: 0,
      selectedCandidates: 0,
      rejectedCandidates: 0,
      finalPaymentPending: 0,
      completedCandidates: 0,
      totalRevenue: 0,
    },
    recentApplications: [],
  });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent && mountedRef.current) setLoading(true);
    try {
      const { data } = await fetchAdminDashboardSummary();
      if (!mountedRef.current) return;
      setSummary((prev) => ({
        cards: data?.cards || prev.cards,
        recentApplications: data?.recentApplications || [],
      }));
    } catch {
      if (!mountedRef.current) return;
      setSummary((prev) => ({ ...prev, recentApplications: [] }));
    } finally {
      if (!silent && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let intervalId = null;
    const initialLoadId = window.setTimeout(() => {
      load();
    }, 0);
    intervalId = window.setInterval(() => {
      load({ silent: true });
    }, 15000);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialLoadId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [load]);

  const visibleCards = cardConfig.filter((card) => {
    if (card.requiredPermission && !can(card.requiredPermission)) return false;
    if (Array.isArray(card.requiredRoles) && card.requiredRoles.length && !card.requiredRoles.includes(String(role || ''))) return false;
    return true;
  });

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        {/* <p className="text-sm text-slate-600">Pipeline snapshot and recent admin activity.</p> */}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card) => (
          <button key={card.key} type="button" onClick={() => card.to && navigate(card.to)} className="rounded-xl border border-slate-200 bg-white p-4 text-left">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {card.key === 'totalRevenue' ? `USD ${summary.cards[card.key] || 0}` : summary.cards[card.key] || 0}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-1">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Applications</h2>
          {loading && <p className="mt-3 text-sm text-slate-500">Loading...</p>}
          {!loading && !summary.recentApplications.length && <p className="mt-3 text-sm text-slate-500">No recent applications.</p>}
          {!loading && summary.recentApplications.length > 0 && (
            <div className="mt-3 space-y-2">
              {summary.recentApplications.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => navigate(`/admin/candidate/${item._id}`)}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.email}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
