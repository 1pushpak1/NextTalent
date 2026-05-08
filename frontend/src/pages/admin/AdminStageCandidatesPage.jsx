import { useCallback, useEffect, useRef, useState } from 'react';
import AdminCandidateTable from '../../components/admin/AdminCandidateTable';
import api from '../../api/axios';

export default function AdminStageCandidatesPage({ title, stageKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('current');
  const mountedRef = useRef(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent && mountedRef.current) setLoading(true);
    try {
      const { data } = await api.get(`/admin/candidates/stage/${stageKey}`, {
        params: { filter: viewFilter },
      });
      if (!mountedRef.current) return;
      setRows(Array.isArray(data) ? data : []);
    } catch {
      if (!mountedRef.current) return;
      setRows([]);
    } finally {
      if (!silent && mountedRef.current) setLoading(false);
    }
  }, [stageKey, viewFilter]);

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
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600">Use this queue to find candidates who need attention, then open the review workspace to inspect submitted evidence before deciding.</p>
        </div>
        <div className="ml-auto flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              viewFilter === 'current' ? 'bg-[#c8a96b] text-black' : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setViewFilter('current')}
          >
            Current Queue
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              viewFilter === 'passed' ? 'bg-[#c8a96b] text-black' : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setViewFilter('passed')}
          >
            Passed Candidates
          </button>
        </div>
      </div>
      <AdminCandidateTable rows={rows} loading={loading} stageKey={stageKey} onUpdated={() => load({ silent: true })} />
    </section>
  );
}
