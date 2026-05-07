import { useEffect, useState } from 'react';
import ApprovalReviewModal from '../../components/admin/ApprovalReviewModal';
import {
  fetchApprovalAuditHistory,
  reviewPayment,
} from '../../api/adminApi';
import api from '../../api/axios';
import usePermissions from '../../hooks/usePermissions';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const formatStatus = (value) =>
  String(value || '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const getStatusOptions = (paymentType) => {
  if (paymentType === 'program' || paymentType === 'final') {
    return [
      { label: 'Approve Payment', value: 'completed', variant: 'primary' },
      { label: 'Reject Payment', value: 'failed', variant: 'danger' },
      { label: 'Keep Pending', value: 'pending', variant: 'secondary' },
    ];
  }
  return [
    { label: 'Approve Payment', value: 'completed', variant: 'primary' },
    { label: 'Reject Payment', value: 'failed', variant: 'danger' },
    { label: 'Mark Refunded', value: 'refunded', variant: 'secondary' },
  ];
};

const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

export default function AdminPaymentTypePage({ title, type }) {
  const { can } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeReview, setActiveReview] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/payments/${type}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payment records');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  const openReview = async (row) => {
    setActiveReview(row);
    try {
      const { data } = await fetchApprovalAuditHistory(row.candidateId);
      setAuditHistory((data?.approvalHistory || []).filter((item) => item.approvalType === 'payment_verification'));
    } catch {
      setAuditHistory([]);
    }
  };

  const submitReview = async ({ decision, reasonNote, reviewConfirmed, evidenceViewed }) => {
    if (!activeReview?.paymentId) return;
    await reviewPayment(activeReview.paymentId, {
      status: decision,
      reasonNote,
      reviewConfirmed,
      evidenceViewed,
      sourcePage: `/admin/payments/${type}`,
    });
    await load();
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">Review actual proof before verifying any payment. Every decision is audit logged.</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading payments...</p>}
      {!!error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {!loading && !error && !rows.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No records found.</p>}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Proof</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.paymentId || `pending-${row.candidateId}`} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.candidateName}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p>{formatStatus(row.paymentType)}</p>
                      <p className="text-xs text-slate-500">{formatDate(row.date)} • {row.transactionId}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">USD {row.amount}</td>
                    <td className="px-4 py-3 text-slate-700">{formatStatus(row.status)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.receiptUrl ? (
                        <a className="text-blue-700 underline" href={`${getBackendBaseUrl()}${row.receiptUrl}`} target="_blank" rel="noreferrer">
                          View receipt
                        </a>
                      ) : (
                        'Receipt not uploaded'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.paymentId && can('payments:verify') ? (
                        <button
                          type="button"
                          className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                          onClick={() => openReview(row)}
                        >
                          Review & Decide
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">{row.paymentId ? 'View only' : 'No payment record'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ApprovalReviewModal
        isOpen={Boolean(activeReview)}
        onClose={() => setActiveReview(null)}
        title="Payment Verification Review"
        candidate={activeReview ? { name: activeReview.candidateName, email: activeReview.email } : null}
        currentStage={title}
        currentStatus={activeReview?.rawStatus || activeReview?.status}
        summaryRows={activeReview ? [
          { label: 'Payment Type', value: formatStatus(activeReview.paymentType) },
          { label: 'Amount', value: `USD ${activeReview.amount}` },
          { label: 'Transaction ID', value: activeReview.transactionId || '—' },
          { label: 'Method', value: formatStatus(activeReview.method) },
          { label: 'Bank Reference', value: activeReview.bankReference || '—' },
        ] : []}
        evidenceItems={activeReview ? [
          activeReview.receiptUrl
            ? {
                key: 'receipt-proof',
                label: 'Open uploaded payment proof',
                description: 'Review the uploaded receipt before approving or rejecting.',
                href: `${getBackendBaseUrl()}${activeReview.receiptUrl}`,
                buttonLabel: 'Open Receipt',
              }
            : {
                key: 'payment-summary',
                label: 'Review payment record details',
                description: 'No receipt is available. Open the payment record summary before deciding.',
                onOpen: () => window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(activeReview, null, 2))}`, '_blank', 'noopener,noreferrer'),
                buttonLabel: 'Open Summary',
              },
        ] : []}
        history={auditHistory}
        decisionOptions={activeReview ? getStatusOptions(activeReview.paymentType) : []}
        onSubmit={submitReview}
      />
    </section>
  );
}
