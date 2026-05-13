import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminPaymentsOverviewPage() {
  const [overview, setOverview] = useState({
    collected: 0,
    initial: 0,
    program: 0,
    final: 0,
    counts: { initial: 0, program: 0, final: 0 },
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get('/admin/payments/overview');
        if (mounted) setOverview(data || overview);
      } catch {
        if (mounted) setOverview((prev) => ({ ...prev }));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-600">Overview of all collected and pending pipeline payments.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Collected</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">USD {overview.collected || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Initial Payments</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">USD {overview.initial || 0}</p>
          <p className="text-xs text-slate-500">Count: {overview.counts?.initial || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Program Payments</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">USD {overview.program || 0}</p>
          <p className="text-xs text-slate-500">Count: {overview.counts?.program || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Final Payments</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">USD {overview.final || 0}</p>
          <p className="text-xs text-slate-500">Count: {overview.counts?.final || 0}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Payment Subsections</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" to="/admin/payments/initial">Initial Payment ($500)</Link>
          <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" to="/admin/payments/program">Program Payment (USD 3,100)</Link>
          <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" to="/admin/payments/final">Final Payment (USD 3,100)</Link>
        </div>
      </div>
    </section>
  );
}
