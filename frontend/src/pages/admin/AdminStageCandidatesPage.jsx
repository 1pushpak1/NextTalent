import { useCallback, useEffect, useRef, useState } from 'react';
import AdminCandidateTable from '../../components/admin/AdminCandidateTable';
import api from '../../api/axios';

export default function AdminStageCandidatesPage({ title, stageKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent && mountedRef.current) setLoading(true);
    try {
      const { data } = await api.get(`/admin/candidates/stage/${stageKey}`);
      if (!mountedRef.current) return;
      setRows(Array.isArray(data) ? data : []);
    } catch {
      if (!mountedRef.current) return;
      setRows([]);
    } finally {
      if (!silent && mountedRef.current) setLoading(false);
    }
  }, [stageKey]);

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">Use step actions for this stage only, then click Complete to save.</p>
      </div>
      <AdminCandidateTable rows={rows} loading={loading} stageKey={stageKey} onUpdated={() => load({ silent: true })} />
    </section>
  );
}
