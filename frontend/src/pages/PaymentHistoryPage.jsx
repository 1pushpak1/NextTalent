import { useEffect, useState } from 'react';
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
  return date.toLocaleDateString();
};

const getPaymentTitle = (type) =>
  type === 'initial' ? 'Initial Payment' : type === 'program' ? 'Program Fee' : 'Final Payment';
const formatStatus = (value) => {
  if (!value) return '—';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const openReceipt = (payment) => {
  const receiptPath = String(payment?.receiptUrl || '').trim();
  if (!receiptPath) {
    alert('Receipt file is not available for this payment yet.');
    return;
  }
  const href = receiptPath.startsWith('http') ? receiptPath : `${getBackendBaseUrl()}${receiptPath}`;
  window.open(href, '_blank', 'noopener,noreferrer');
};

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [statusFilter, setStatusFilter] = useState('completed');

  useEffect(() => {
    api.get('/payments/me').then(({ data }) => setPayments(Array.isArray(data) ? data : [])).catch(() => setPayments([]));
  }, []);

  const filteredPayments = payments.filter((payment) => {
    if (statusFilter === 'all') return true;
    return String(payment.status || '').toLowerCase() === statusFilter;
  });

  return (
    <div className="nst-shell">
      <Navbar />
      <CandidatePortalSidebar />

      <main className="flex-1 pb-20 pt-28 lg:ml-64">
        <div className="mx-auto max-w-[1200px] px-6">
          <section className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#002147]">Payment History</h1>
              <p className="mt-2 text-base text-[#44474e]">All payment transactions and their latest statuses for your pathway.</p>
            </div>
            <div className="w-full max-w-[260px]">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#44474e]">Filter by status</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#3a5f94] focus:ring-2 focus:ring-[#3a5f94]/20"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="completed">Received</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Not Received</option>
                  <option value="refunded">Refunded</option>
                  <option value="all">All</option>
                </select>
              </label>
            </div>
            {/* removed completed-invoices count box as requested */}
          </section>

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
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Payment Record — <span className="normal-case font-semibold text-emerald-700">{formatStatus(payment.status)}</span></p>
                      <h2 className="mt-1 text-2xl font-bold text-[#002147]">{getPaymentTitle(payment.type)}</h2>
                      <p className="mt-1 text-sm text-slate-500">Transaction ID: {payment.transactionId || '—'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                        <p className="text-lg font-semibold text-slate-900">{formatDate(payment.createdAt)}</p>
                      </div>
                      <div className="ml-auto rounded-xl bg-slate-50 px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                        <p className="text-2xl font-bold text-[#002147]">USD {payment.amount || 0}</p>
                      </div>
                    </div>
                  </div>
                  {String(payment.status || '').toLowerCase() === 'completed' && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="secondary" className="text-white" onClick={() => setSelectedPayment(payment)}>View</Button>
                      <Button variant="secondary" className="text-white" onClick={() => openReceipt(payment)}>Download Invoice</Button>
                    </div>
                  )}
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
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Type</p><p className="mt-1 font-medium text-slate-900">{getPaymentTitle(selectedPayment.type)}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 font-medium text-slate-900">{formatStatus(selectedPayment.status)}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Amount</p><p className="mt-1 font-medium text-slate-900">{selectedPayment.currency || 'USD'} {selectedPayment.amount || 0}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Method</p><p className="mt-1 font-medium text-slate-900">{selectedPayment.method || '—'}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Transaction ID</p><p className="mt-1 font-medium text-slate-900">{selectedPayment.transactionId || '—'}</p></div>
            <div className="rounded-md bg-slate-100 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 font-medium text-slate-900">{formatDate(selectedPayment.createdAt)}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
