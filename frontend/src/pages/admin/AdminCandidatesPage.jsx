import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAdminCandidates } from '../../api/adminApi';
import usePermissions from '../../hooks/usePermissions';

const stageOptions = ['', 'profile_review', 'initial_payment', 'document_verification', 'hiring', 'selection', 'final_payment', 'testimonial'];
const profileStatusOptions = ['', 'submitted', 'under_review', 'accepted', 'rejected'];
const paymentStatusOptions = ['', 'not_started', 'pending_verification', 'verified', 'partially_verified'];
const documentStatusOptions = ['', 'not_uploaded', 'uploaded', 'under_review', 'needs_revision', 'verified'];
const selectionStatusOptions = ['', 'pending', 'under_review', 'selected', 'rejected'];
const DEFAULT_FORCED_FILTERS = Object.freeze({});

const humanize = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export default function AdminCandidatesPage({
  pageTitle = 'Candidates',
  pageSubtitle = 'Track all candidates and pending actions in one place.',
  forcedFilters = DEFAULT_FORCED_FILTERS,
}) {
  const { can, role } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(() => {
    const base = {
      q: searchParams.get('q') || '',
      stage: searchParams.get('stage') || '',
      profileStatus: searchParams.get('profileStatus') || '',
      paymentStatus: searchParams.get('paymentStatus') || '',
      documentStatus: searchParams.get('documentStatus') || '',
      selectionStatus: searchParams.get('selectionStatus') || '',
      pendingFrom: searchParams.get('pendingFrom') || '',
      page: Number(searchParams.get('page') || 1),
    };
    return { ...base, ...forcedFilters };
  }, [searchParams, forcedFilters]);
  const [draftFilters, setDraftFilters] = useState(filters);
  const showPaymentAccess = can('payments:verify');
  const showDocumentAccess = can('documents:verify');
  const showSelectionAccess = can('selection:publish');
  const availableStageOptions = useMemo(
    () =>
      stageOptions.filter((stage) => {
        if (!stage) return true;
        if (stage === 'document_verification') return showDocumentAccess;
        if (stage === 'selection') return showSelectionAccess;
        if (stage === 'hiring') return can('candidates:update');
        if (stage === 'profile_review') return can('evaluation:approve');
        if (stage === 'final_payment') return showPaymentAccess;
        return true;
      }),
    [showDocumentAccess, showSelectionAccess, can, showPaymentAccess],
  );

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
    if (showPaymentAccess && draftFilters.paymentStatus) next.set('paymentStatus', draftFilters.paymentStatus);
    if (showDocumentAccess && draftFilters.documentStatus) next.set('documentStatus', draftFilters.documentStatus);
    if (showSelectionAccess && draftFilters.selectionStatus) next.set('selectionStatus', draftFilters.selectionStatus);
    if (draftFilters.pendingFrom) next.set('pendingFrom', draftFilters.pendingFrom);
    Object.entries(forcedFilters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== '') {
        next.set(key, String(value));
      }
    });
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
      selectionStatus: '',
      pendingFrom: '',
      page: 1,
    });
    const next = new URLSearchParams({ page: '1' });
    Object.entries(forcedFilters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== '') {
        next.set(key, String(value));
      }
    });
    setSearchParams(next);
  };

  const setPage = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
          <p className="text-sm text-slate-600">{pageSubtitle}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
          onClick={() => setFiltersOpen((value) => !value)}
          aria-label={filtersOpen ? 'Close filters' : 'Open filters'}
          title={filtersOpen ? 'Close filters' : 'Open filters'}
        >
          <span className="material-symbols-outlined text-[20px] leading-none">
            {filtersOpen ? 'filter_alt_off' : 'filter_alt'}
          </span>
        </button>
      </div>

      {filtersOpen && (
        <div className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Search name/email/phone" value={draftFilters.q} onChange={(e) => setDraftFilter('q', e.target.value)} />
          {forcedFilters?.stage ? null : (
            <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.stage} onChange={(e) => setDraftFilter('stage', e.target.value)}>{availableStageOptions.map((item) => <option key={item} value={item}>{item ? humanize(item) : 'All Stages'}</option>)}</select>
          )}
          <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.profileStatus} onChange={(e) => setDraftFilter('profileStatus', e.target.value)}>
            {profileStatusOptions.map((item) => <option key={item || 'all-profile'} value={item}>{item ? humanize(item) : 'All Profile Statuses'}</option>)}
          </select>
          {showPaymentAccess && (
            <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.paymentStatus} onChange={(e) => setDraftFilter('paymentStatus', e.target.value)}>
              {paymentStatusOptions.map((item) => <option key={item || 'all-payment'} value={item}>{item ? humanize(item) : 'All Payment Statuses'}</option>)}
            </select>
          )}
          {showDocumentAccess && (
            <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.documentStatus} onChange={(e) => setDraftFilter('documentStatus', e.target.value)}>
              {documentStatusOptions.map((item) => <option key={item || 'all-document'} value={item}>{item ? humanize(item) : 'All Document Statuses'}</option>)}
            </select>
          )}
          {showSelectionAccess && (
            <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.selectionStatus} onChange={(e) => setDraftFilter('selectionStatus', e.target.value)}>
              {selectionStatusOptions.map((item) => <option key={item || 'all-selection'} value={item}>{item ? humanize(item) : 'All Selection Statuses'}</option>)}
            </select>
          )}
          {forcedFilters?.pendingFrom ? null : (
            <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={draftFilters.pendingFrom} onChange={(e) => setDraftFilter('pendingFrom', e.target.value)}>
              <option value="">All Pending Types</option><option value="admin">Pending From Admin</option><option value="candidate">Pending From Candidate</option>
            </select>
          )}
          <button type="button" className="rounded border border-[#c8a96b] bg-[#c8a96b] px-3 py-2 text-sm font-semibold text-black hover:bg-[#d4b87e]" onClick={applyFilters}>
            Apply Filters
          </button>
          <button type="button" className="rounded border border-[rgba(200,169,107,0.38)] px-3 py-2 text-sm font-semibold text-[#f7f3ea] hover:bg-[rgba(200,169,107,0.12)]" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading candidates...</p>}
      {!!error && <p className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!loading && !error && !rows.length && <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">No candidates match your filters.</p>}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Candidate</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Profile</th>{showPaymentAccess ? <th className="px-3 py-2">Payment</th> : null}{showDocumentAccess ? <th className="px-3 py-2">Documents</th> : null}{showSelectionAccess ? <th className="px-3 py-2">Selection</th> : null}<th className="px-3 py-2">Next Action</th><th className="px-3 py-2">Pending From</th><th className="px-3 py-2">Updated</th></tr></thead>
            <tbody>
              {rows.map((row) => <tr key={row._id} className="border-t border-slate-100"><td className="px-3 py-2"><Link className="font-semibold text-[#d7c08a] hover:underline" to={`/admin/candidates/${row._id}`}>{row.name}</Link><div className="text-xs text-slate-500">{row.email} {row.phone ? `• ${row.phone}` : ''}</div></td><td className="px-3 py-2">{row.currentStage}</td><td className="px-3 py-2">{humanize(row.profileStatus)}</td>{showPaymentAccess ? <td className="px-3 py-2">{row.paymentSummaryLabel}</td> : null}{showDocumentAccess ? <td className="px-3 py-2">{row.documentStatusLabel}</td> : null}{showSelectionAccess ? <td className="px-3 py-2">{row.interviewSelectionStatusLabel}</td> : null}<td className="px-3 py-2">{row.nextPendingAction}</td><td className="px-3 py-2">{humanize(row.pendingFrom)}</td><td className="px-3 py-2">{row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toLocaleDateString() : '—'}</td></tr>)}
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
