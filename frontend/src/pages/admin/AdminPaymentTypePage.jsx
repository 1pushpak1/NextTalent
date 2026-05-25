import { useEffect, useState } from 'react';
import ApprovalReviewModal from '../../components/admin/ApprovalReviewModal';
import Modal from '../../components/Modal';
import {
  fetchApprovalAuditHistory,
  initiateCandidateRefund,
  reviewPayment,
  sendCandidatePaymentInstruction,
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

const decisionLabelFromRawStatus = (rawStatus) => {
  const normalized = String(rawStatus || '').toLowerCase();
  if (normalized === 'completed') return 'Approved';
  if (normalized === 'failed') return 'Rejected';
  if (normalized === 'refunded') return 'Refunded';
  return 'Pending Review';
};

const getStatusOptions = (paymentType) => {
  if (paymentType === 'program' || paymentType === 'final') {
    return [
      { label: 'Mark Payment Received', value: 'completed', variant: 'primary' },
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
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundCandidateId, setRefundCandidateId] = useState('');
  const [refundConfirming, setRefundConfirming] = useState(false);
  const [refundSaving, setRefundSaving] = useState(false);
  const [mailSendingForCandidateId, setMailSendingForCandidateId] = useState('');

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

  const refundableRows = rows.filter((row) => {
    const normalized = String(row?.rawStatus || '').toLowerCase();
    return Boolean(row?.paymentId) && ['completed', 'verified', 'paid'].includes(normalized);
  });

  const selectedRefundRow = refundableRows.find((row) => String(row.candidateId) === String(refundCandidateId)) || null;

  const openRefundFlow = () => {
    setRefundCandidateId('');
    setRefundConfirming(false);
    setRefundModalOpen(true);
  };

  const proceedRefundConfirmation = () => {
    if (!refundCandidateId) {
      alert('Select a candidate first.');
      return;
    }
    setRefundConfirming(true);
  };

  const submitRefund = async () => {
    if (!selectedRefundRow?.paymentId) return;
    setRefundSaving(true);
    setError('');
    try {
      await initiateCandidateRefund(selectedRefundRow.candidateId, {
        paymentIds: [selectedRefundRow.paymentId],
        adminDeduction: 0,
      });
      setRefundModalOpen(false);
      setRefundConfirming(false);
      setRefundCandidateId('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue refund');
    } finally {
      setRefundSaving(false);
    }
  };

  const sendInstructionMail = async (candidateId) => {
    if (!candidateId || !['program', 'final'].includes(type)) return;
    setMailSendingForCandidateId(String(candidateId));
    setError('');
    try {
      await sendCandidatePaymentInstruction(candidateId, { type });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send payment instruction email');
    } finally {
      setMailSendingForCandidateId('');
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">Review actual proof before verifying any payment. Every decision is audit logged.</p>
      </div>

      {(type === 'program' || type === 'final') && can('payments:verify') && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="rounded-xl border border-[rgba(200,169,107,0.35)] px-3 py-2 text-xs font-semibold text-[#f7f3ea] transition hover:bg-[rgba(200,169,107,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={openRefundFlow}
            disabled={!refundableRows.length}
          >
            Issue Refund
          </button>
        </div>
      )}

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
                    <td className="px-4 py-3 text-slate-700">
                      <p>{formatStatus(row.status)}</p>
                      <p className="text-xs text-slate-500">Response: {decisionLabelFromRawStatus(row.rawStatus)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.receiptUrl ? (
                        <a className="text-[#d7c08a] underline" href={`${getBackendBaseUrl()}${row.receiptUrl}`} target="_blank" rel="noreferrer">
                          View receipt
                        </a>
                      ) : (
                        'Receipt not uploaded'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {can('payments:verify') && (type === 'program' || type === 'final') ? (
                          <button
                            type="button"
                            className="rounded-xl border border-[rgba(200,169,107,0.35)] px-3 py-2 text-xs font-semibold text-[#f7f3ea] transition hover:bg-[rgba(200,169,107,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => sendInstructionMail(row.candidateId)}
                            disabled={mailSendingForCandidateId === String(row.candidateId)}
                          >
                            {mailSendingForCandidateId === String(row.candidateId)
                              ? 'Sending...'
                              : type === 'program'
                                ? 'Send Program Fee Email'
                                : 'Send Final Payment Email'}
                          </button>
                        ) : null}
                        {row.paymentId && can('payments:verify') ? (
                          <button
                            type="button"
                            className="rounded-xl border border-[rgba(200,169,107,0.35)] px-3 py-2 text-xs font-semibold text-[#f7f3ea] transition hover:bg-[rgba(200,169,107,0.12)]"
                            onClick={() => openReview(row)}
                          >
                            {String(row.rawStatus || '').toLowerCase() === 'pending' ? 'Review & Decide' : 'Edit Status'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">{row.paymentId ? 'View only' : 'No payment record'}</span>
                        )}
                      </div>
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
          ...(activeReview.receiptUrl
            ? [{
                key: 'receipt-proof',
                label: 'Open uploaded payment proof',
                description: 'Review the uploaded receipt before confirming receipt.',
                href: `${getBackendBaseUrl()}${activeReview.receiptUrl}`,
                buttonLabel: 'Open Receipt',
              }]
            : []),
        ] : []}
        history={auditHistory}
        decisionOptions={activeReview ? getStatusOptions(activeReview.paymentType) : []}
        onSubmit={submitReview}
      />

      <Modal isOpen={refundModalOpen} onClose={() => setRefundModalOpen(false)} title="Issue Refund">
        <div className="space-y-4">
          {!refundConfirming ? (
            <>
              <p className="text-sm text-slate-600">Select the candidate whose refund should be issued.</p>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                value={refundCandidateId}
                onChange={(event) => setRefundCandidateId(event.target.value)}
                disabled={refundSaving}
              >
                <option value="">Select candidate</option>
                {refundableRows.map((row) => (
                  <option key={row.paymentId} value={row.candidateId}>
                    {row.candidateName} • {row.email} • USD {row.amount}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-[#c8a96b] px-4 py-2 text-sm font-semibold text-black"
                  onClick={proceedRefundConfirmation}
                  disabled={refundSaving}
                >
                  Continue
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={() => setRefundModalOpen(false)}
                  disabled={refundSaving}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Confirm refund issue for <span className="font-semibold text-slate-900">{selectedRefundRow?.candidateName || 'selected candidate'}</span>.
                This will send the refund email and mark payment as refunded.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-[#c8a96b] px-4 py-2 text-sm font-semibold text-black"
                  onClick={submitRefund}
                  disabled={refundSaving}
                >
                  {refundSaving ? 'Issuing...' : 'Confirm Refund'}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={() => setRefundConfirming(false)}
                  disabled={refundSaving}
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </section>
  );
}
