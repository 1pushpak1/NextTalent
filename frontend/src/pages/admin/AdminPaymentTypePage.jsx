import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import api from '../../api/axios';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const formatStatus = (value) => {
  if (!value) return '—';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
const getStatusOptions = (paymentType) => {
  if (paymentType === 'program' || paymentType === 'final') {
    return [
      { label: 'Received', value: 'completed' },
      { label: 'Not Received', value: 'failed' },
      { label: 'Pending Verification', value: 'pending' },
    ];
  }
  return [
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
    { label: 'Refunded', value: 'refunded' },
  ];
};

export default function AdminPaymentTypePage({ title, type }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

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

  const updateStatus = async () => {
    if (!editingPayment?.paymentId) return;
    try {
      setSaving(true);
      const key = editingPayment.paymentId || `pending-${editingPayment.candidateId}`;
      await api.put(`/admin/payments/${editingPayment.paymentId}/status`, { status: draft[key] || 'pending' });
      await load();
      setEditingPayment(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to update payment status');
    } finally {
      setSaving(false);
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
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Receipt</th>
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
                      <td className="px-4 py-3 text-slate-600">{formatStatus(row.status)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.transactionId}</td>
                      <td className="px-4 py-3 text-slate-600">{formatStatus(row.method)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.receiptUrl ? (
                          <a className="text-blue-700 underline" href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '')}${row.receiptUrl}`} target="_blank" rel="noreferrer">
                            View Receipt
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.paymentId ? (
                          <Button
                            variant="secondary"
                            className="px-3 py-2 text-xs"
                            onClick={() => setEditingPayment(row)}
                          >
                            {row.method === 'bank_transfer' ? 'Mark / Update Received' : 'Edit Payment Status'}
                          </Button>
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

      <Modal
        isOpen={Boolean(editingPayment)}
        onClose={() => !saving && setEditingPayment(null)}
        title="Edit Payment Status"
      >
        {editingPayment && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Candidate</p>
                <p className="mt-1 font-medium text-slate-900">{editingPayment.candidateName}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Payment Type</p>
                <p className="mt-1 font-medium text-slate-900">{editingPayment.paymentType}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
                <p className="mt-1 font-medium text-slate-900">USD {editingPayment.amount}</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Transaction ID</p>
                <p className="mt-1 font-medium text-slate-900">{editingPayment.transactionId || '—'}</p>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#d3d3d8]">Payment Status</span>
              <select
                className="w-full rounded-lg border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.035)] px-3 py-2.5 text-sm text-[#f7f3ea] outline-none transition focus:border-[#c8a96b] focus:ring-2 focus:ring-[#c8a96b]/20"
                value={draft[editingPayment.paymentId || `pending-${editingPayment.candidateId}`] || 'pending'}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    [editingPayment.paymentId || `pending-${editingPayment.candidateId}`]: e.target.value,
                  }))
                }
              >
                {getStatusOptions(editingPayment.paymentType).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditingPayment(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={updateStatus} disabled={saving}>
                {saving ? 'Saving...' : 'Save Status'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
