import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminDashboardSummary } from '../../api/adminApi';

const cardConfig = [
  { key: 'totalApplications', label: 'Total Candidates', to: '/admin/candidates' },
  { key: 'eligibleCandidates', label: 'Eligible Candidates', to: '/admin/candidates?profileStatus=accepted' },
  { key: 'profilesPendingReview', label: 'Profiles Pending Review', to: '/admin/candidates?stage=profile_review&pendingFrom=admin' },
  { key: 'paymentsPendingVerification', label: 'Payments Pending Verification', to: '/admin/candidates?paymentStatus=pending_verification' },
  { key: 'documentsPendingVerification', label: 'Documents Pending Verification', to: '/admin/candidates?documentStatus=under_review&pendingFrom=admin' },
  { key: 'interviewsPendingScheduled', label: 'Results Pending Announcement', to: '/admin/candidates?stage=selection' },
  { key: 'selectedCandidates', label: 'Selected Candidates', to: '/admin/candidates?selectionStatus=selected' },
  { key: 'rejectedCandidates', label: 'Rejected Candidates', to: '/admin/candidates?selectionStatus=rejected' },
  { key: 'totalRevenue', label: 'Total Revenue' },
];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const [summary, setSummary] = useState({
    cards: {
      totalApplications: 0,
      eligibleCandidates: 0,
      profilesPendingReview: 0,
      paymentsPendingVerification: 0,
      documentsPendingVerification: 0,
      interviewsPendingScheduled: 0,
      selectedCandidates: 0,
      rejectedCandidates: 0,
      totalRevenue: 0,
    },
    recentApplications: [],
    recentPayments: [],
  });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent && mountedRef.current) setLoading(true);
    try {
      const { data } = await fetchAdminDashboardSummary();
      if (!mountedRef.current) return;
      setSummary((prev) => ({
        cards: data?.cards || prev.cards,
        recentApplications: data?.recentApplications || [],
        recentPayments: data?.recentPayments || [],
      }));
    } catch {
      if (!mountedRef.current) return;
      setSummary((prev) => ({ ...prev, recentApplications: [], recentPayments: [] }));
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

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Pipeline snapshot and recent admin activity.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cardConfig.map((card) => (
          <button key={card.key} type="button" onClick={() => card.to && navigate(card.to)} className="rounded-xl border border-slate-200 bg-white p-4 text-left">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {card.key === 'totalRevenue' ? `USD ${summary.cards[card.key] || 0}` : summary.cards[card.key] || 0}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Payments</h2>
          {loading && <p className="mt-3 text-sm text-slate-500">Loading...</p>}
          {!loading && !summary.recentPayments.length && <p className="mt-3 text-sm text-slate-500">No recent payments.</p>}
          {!loading && summary.recentPayments.length > 0 && (
            <div className="mt-3 space-y-2">
              {summary.recentPayments.map((item) => (
                <div key={item._id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.candidateName}</p>
                    <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                  </div>
                  <p className="text-xs text-slate-600">{item.type} • {item.currency} {item.amount} • {item.status}</p>
                  <p className="text-xs text-slate-500">Txn: {item.transactionId || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
