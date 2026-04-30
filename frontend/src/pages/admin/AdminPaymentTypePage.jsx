import { useEffect, useState } from 'react';
import api from '../../api/axios';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const statusOptions = ['completed', 'pending', 'failed', 'refunded'];

export default function AdminPaymentTypePage({ title, type }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/payments/${type}`);
      const nextRows = Array.isArray(data) ? data : [];
      setRows(nextRows);
      const nextDraft = {};
      nextRows.forEach((r) => {
        nextDraft[r.paymentId || `pending-${r.candidateId}`] = r.rawStatus || 'pending';
      });
      setDraft(nextDraft);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  const updateStatus = async (paymentId, key) => {
    if (!paymentId) return;
    try {
      await api.put(`/admin/payments/${paymentId}/status`, { status: draft[key] || 'pending' });
      await load();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to update payment status');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">Paid and pending records for this payment stage.</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading payments...</p>}
      {!loading && !rows.length && <p className="text-sm text-slate-500">No records found.</p>}

      {!loading && rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Candidate Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Payment Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Transaction ID</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = row.paymentId || `pending-${row.candidateId}`;
                  return (
                    <tr key={key} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.candidateName}</td>
                      <td className="px-4 py-3 text-slate-600">{row.email}</td>
                      <td className="px-4 py-3 text-slate-600">{row.paymentType}</td>
                      <td className="px-4 py-3 text-slate-600">USD {row.amount}</td>
                      <td className="px-4 py-3 text-slate-600">{row.status}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.transactionId}</td>
                      <td className="px-4 py-3">
                        {row.paymentId ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              value={draft[key] || 'pending'}
                              onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                            >
                              {statusOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                              onClick={() => updateStatus(row.paymentId, key)}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No payment record</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
