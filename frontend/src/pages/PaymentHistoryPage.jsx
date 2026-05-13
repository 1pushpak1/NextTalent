import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CandidatePortalSidebar from '../components/CandidatePortalSidebar';
import Button from '../components/Button';
import Modal from '../components/Modal';
import api from '../api/axios';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const formatStatus = (value) => {
  if (!value) return '—';
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const prettyStage = (stage) => {
  switch (stage) {
    case 'INITIAL_ONBOARDING_FEE':
      return 'Initial Onboarding Fee (USD $500, Non-Refundable)';
    case 'FIRST_INSTALLMENT':
      return 'First Installment (USD $3,100)';
    case 'FINAL_PAYMENT':
      return 'Final Payment (USD $3,100)';
    default:
      return stage || '—';
  }
};

const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const absoluteUrl = (relativeOrAbsolute) => {
  const raw = String(relativeOrAbsolute || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `${getBackendBaseUrl()}${raw}`;
};

const openFileLink = (url) => {
  const final = absoluteUrl(url);
  if (!final) {
    alert('File is not available yet.');
    return;
  }
  window.open(final, '_blank', 'noopener,noreferrer');
};

export default function PaymentHistoryPage() {
  const [payload, setPayload] = useState({ payments: [], paymentStages: [], backgroundCheckStatus: 'not_started' });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    api
      .get('/candidate/payments')
      .then(({ data }) => setPayload(data || { payments: [], paymentStages: [] }))
      .catch(() => setPayload({ payments: [], paymentStages: [], backgroundCheckStatus: 'not_started' }));
  }, []);

  const payments = Array.isArray(payload?.payments) ? payload.payments : [];
  const invoices = Array.isArray(payload?.invoices) ? payload.invoices : [];

  const filteredPayments = useMemo(() => {
    if (statusFilter === 'all') return payments;
    return payments.filter((payment) => String(payment.status || '').toLowerCase() === statusFilter);
  }, [payments, statusFilter]);

  return (
    <div className="nst-shell">
      <Navbar />
      <CandidatePortalSidebar />

      <main className="flex-1 pb-20 pt-28 lg:ml-64">
        <div className="mx-auto max-w-[1200px] px-6">
          <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#002147]">Payment History</h1>
              <p className="mt-2 text-base text-[#44474e]">
                Stage-wise payments, invoice links, receipt links, and verification references.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Background Check Status: <b>{formatStatus(payload?.backgroundCheckStatus)}</b>
              </p>
            </div>

            <div className="w-full max-w-[260px]">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#44474e]">Filter by status</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#3a5f94] focus:ring-2 focus:ring-[#3a5f94]/20"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="rejected">Rejected</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
            </div>
          </section>

          <section className="mb-8 grid gap-3 md:grid-cols-3">
            {(payload?.paymentStages || []).map((stage) => (
              <article key={stage.stage} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{prettyStage(stage.stage)}</p>
                <p className="mt-2 text-sm text-slate-700">Status: <b>{formatStatus(stage.status)}</b></p>
                <p className="text-sm text-slate-700">Method: {formatStatus(stage.method)}</p>
                {stage.stage === 'INITIAL_ONBOARDING_FEE' && (
                  <p className="mt-2 text-xs text-rose-700">Strictly non-refundable once paid.</p>
                )}
                {stage.refundInfo && (
                  <p className="mt-2 text-xs text-slate-600">
                    Not selected after interviews: refund eligible USD $2,900 after USD $200 deduction.
                  </p>
                )}
              </article>
            ))}
          </section>

          {!!invoices.length && (
            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-[#002147]">Generated Invoices</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {invoices.map((invoice) => (
                  <article key={invoice._id} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-600">{prettyStage(invoice.paymentStage)}</p>
                    <p className="text-xs text-slate-500">Status: {invoice.paymentStatus || 'DUE'}</p>
                    <Button className="mt-3 text-white" variant="secondary" onClick={() => openFileLink(invoice.pdfUrl)}>
                      Download Invoice
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {!filteredPayments.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
              No payment records found for the selected status.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPayments.map((payment) => (
                <article key={payment._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        {prettyStage(payment.stage)}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-[#002147]">{formatStatus(payment.status)}</h2>
                      <p className="mt-1 text-sm text-slate-500">Method: {formatStatus(payment.method)}</p>
                      <p className="text-sm text-slate-500">Transaction/Reference ID: {payment.transactionReferenceId || payment.transactionId || '—'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid / Verified Date</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(payment.verifiedAt || payment.createdAt)}</p>
                      </div>
                      <div className="ml-auto rounded-xl bg-slate-50 px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                        <p className="text-2xl font-bold text-[#002147]">{payment.currency || 'USD'} {payment.amount || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="secondary" className="text-white" onClick={() => setSelectedPayment(payment)}>View</Button>
                    {payment.invoice?.pdfUrl ? (
                      <Button variant="secondary" className="text-white" onClick={() => openFileLink(payment.invoice.pdfUrl)}>
                        Download Invoice
                      </Button>
                    ) : null}
                    {payment.receipt?.pdfUrl ? (
                      <Button variant="secondary" className="text-white" onClick={() => openFileLink(payment.receipt.pdfUrl)}>
                        Download Receipt
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="relative z-30 lg:ml-64">
        <Footer />
      </div>

      <Modal isOpen={Boolean(selectedPayment)} onClose={() => setSelectedPayment(null)} title="Transaction Details">
        {selectedPayment && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Stage</p><p className="mt-1 font-medium text-slate-900">{prettyStage(selectedPayment.stage)}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 font-medium text-slate-900">{formatStatus(selectedPayment.status)}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Amount</p><p className="mt-1 font-medium text-slate-900">{selectedPayment.currency || 'USD'} {selectedPayment.amount || 0}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Method</p><p className="mt-1 font-medium text-slate-900">{formatStatus(selectedPayment.method)}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Transaction / Reference ID</p><p className="mt-1 font-medium break-all text-slate-900">{selectedPayment.transactionReferenceId || selectedPayment.transactionId || '—'}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 font-medium text-slate-900">{formatDate(selectedPayment.verifiedAt || selectedPayment.createdAt)}</p></div>
            <div className="rounded-md bg-slate-100 p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Refund Info</p>
              <p className="mt-1 text-sm text-slate-900">
                {selectedPayment.refundStatus
                  ? `${formatStatus(selectedPayment.refundStatus)}${selectedPayment.refundableAmount ? ` | Refundable: USD ${selectedPayment.refundableAmount}` : ''}${selectedPayment.nonRefundableAmount ? ` | Non-refundable: USD ${selectedPayment.nonRefundableAmount}` : ''}`
                  : 'No refund status available.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
