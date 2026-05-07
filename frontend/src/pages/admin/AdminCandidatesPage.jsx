import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAdminCandidates } from '../../api/adminApi';

const stageOptions = ['', 'profile_review', 'initial_payment', 'document_verification', 'hiring', 'interviews', 'selection', 'final_payment', 'testimonial'];
const profileStatusOptions = ['', 'submitted', 'under_review', 'accepted', 'rejected'];
const paymentStatusOptions = ['', 'not_started', 'pending_verification', 'verified', 'partially_verified'];
const documentStatusOptions = ['', 'not_uploaded', 'uploaded', 'under_review', 'needs_revision', 'verified'];
const interviewStatusOptions = ['', 'not_scheduled', 'scheduled', 'completed'];
const selectionStatusOptions = ['', 'pending', 'under_review', 'selected', 'rejected'];

const humanize = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export default function AdminCandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const filters = useMemo(() => ({
    q: searchParams.get('q') || '',
    stage: searchParams.get('stage') || '',
    profileStatus: searchParams.get('profileStatus') || '',
    paymentStatus: searchParams.get('paymentStatus') || '',
    documentStatus: searchParams.get('documentStatus') || '',
    interviewStatus: searchParams.get('interviewStatus') || '',
    selectionStatus: searchParams.get('selectionStatus') || '',
    pendingFrom: searchParams.get('pendingFrom') || '',
    page: Number(searchParams.get('page') || 1),
  }), [searchParams]);
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await fetchAdminCandidates({ ...filters, limit: 20, sortBy: 'updatedAt', sortOrder: 'desc' });
        if (!active) return;
        setRows(data?.candidates || data?.rows || []);
        setPagination(data?.pagination || {
          page: Number(data?.page || 1),
          limit: 20,
          total: Number(data?.total || 0),
          totalPages: Number(data?.totalPages || 0),
        });
      } catch (err) {
        if (!active) return;
        const status = err.response?.status;
        const backendMessage = err.response?.data?.message;
        setError(backendMessage || (status ? `Failed to load candidates (HTTP ${status})` : 'Failed to load candidates'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [filters]);

  const setDraftFilter = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const next = new URLSearchParams();
    if (draftFilters.q) next.set('q', draftFilters.q);
    if (draftFilters.stage) next.set('stage', draftFilters.stage);
    if (draftFilters.profileStatus) next.set('profileStatus', draftFilters.profileStatus);
    if (draftFilters.paymentStatus) next.set('paymentStatus', draftFilters.paymentStatus);
    if (draftFilters.documentStatus) next.set('documentStatus', draftFilters.documentStatus);
    if (draftFilters.interviewStatus) next.set('interviewStatus', draftFilters.interviewStatus);
    if (draftFilters.selectionStatus) next.set('selectionStatus', draftFilters.selectionStatus);
    if (draftFilters.pendingFrom) next.set('pendingFrom', draftFilters.pendingFrom);
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearFilters = () => {
    setDraftFilters({
      q: '',
      stage: '',
      profileStatus: '',
      paymentStatus: '',
      documentStatus: '',
      interviewStatus: '',
      selectionStatus: '',
      pendingFrom: '',
      page: 1,
    });
    setSearchParams(new URLSearchParams({ page: '1' }));
  };

  const setPage = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
        <p className="text-sm text-slate-600">Track all candidates and pending actions in one place.</p>
      </div>

      <div className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Search name/email/phone" value={draftFilters.q} onChange={(e) => setDraftFilter('q', e.target.value)} />
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.stage} onChange={(e) => setDraftFilter('stage', e.target.value)}>{stageOptions.map((item) => <option key={item} value={item}>{item ? humanize(item) : 'All Stages'}</option>)}</select>
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.profileStatus} onChange={(e) => setDraftFilter('profileStatus', e.target.value)}>
          {profileStatusOptions.map((item) => <option key={item || 'all-profile'} value={item}>{item ? humanize(item) : 'All Profile Statuses'}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.paymentStatus} onChange={(e) => setDraftFilter('paymentStatus', e.target.value)}>
          {paymentStatusOptions.map((item) => <option key={item || 'all-payment'} value={item}>{item ? humanize(item) : 'All Payment Statuses'}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.documentStatus} onChange={(e) => setDraftFilter('documentStatus', e.target.value)}>
          {documentStatusOptions.map((item) => <option key={item || 'all-document'} value={item}>{item ? humanize(item) : 'All Document Statuses'}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.interviewStatus} onChange={(e) => setDraftFilter('interviewStatus', e.target.value)}>
          {interviewStatusOptions.map((item) => <option key={item || 'all-interview'} value={item}>{item ? humanize(item) : 'All Interview Statuses'}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.selectionStatus} onChange={(e) => setDraftFilter('selectionStatus', e.target.value)}>
          {selectionStatusOptions.map((item) => <option key={item || 'all-selection'} value={item}>{item ? humanize(item) : 'All Selection Statuses'}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.pendingFrom} onChange={(e) => setDraftFilter('pendingFrom', e.target.value)}>
          <option value="">All Pending Types</option><option value="admin">Pending From Admin</option><option value="candidate">Pending From Candidate</option>
        </select>
        <button type="button" className="rounded bg-[#1d4ed8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1e40af]" onClick={applyFilters}>
          Apply Filters
        </button>
        <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading candidates...</p>}
      {!!error && <p className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!loading && !error && !rows.length && <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">No candidates match your filters.</p>}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Candidate</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Profile</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2">Documents</th><th className="px-3 py-2">Interview/Selection</th><th className="px-3 py-2">Next Action</th><th className="px-3 py-2">Pending From</th><th className="px-3 py-2">Updated</th></tr></thead>
            <tbody>
              {rows.map((row) => <tr key={row._id} className="border-t border-slate-100"><td className="px-3 py-2"><Link className="font-semibold text-blue-700 hover:underline" to={`/admin/candidates/${row._id}`}>{row.name}</Link><div className="text-xs text-slate-500">{row.email} {row.phone ? `• ${row.phone}` : ''}</div></td><td className="px-3 py-2">{row.currentStage}</td><td className="px-3 py-2">{humanize(row.profileStatus)}</td><td className="px-3 py-2">{row.paymentSummaryLabel}</td><td className="px-3 py-2">{row.documentStatusLabel}</td><td className="px-3 py-2">{row.interviewSelectionStatusLabel}</td><td className="px-3 py-2">{row.nextPendingAction}</td><td className="px-3 py-2">{humanize(row.pendingFrom)}</td><td className="px-3 py-2">{row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toLocaleDateString() : '—'}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Total: {pagination.total}</span>
        <div className="space-x-2">
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>Prev</button>
          <span>Page {pagination.page} / {Math.max(1, pagination.totalPages)}</span>
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>Next</button>
        </div>
      </div>
    </section>
  );
}
