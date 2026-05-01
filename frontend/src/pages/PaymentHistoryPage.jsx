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

const printInvoice = (payment) => {
  if (!payment) return;

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${getPaymentTitle(payment.type)} Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          h1 { margin: 0 0 8px; color: #002147; }
          .subtitle { color: #475569; margin-bottom: 24px; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .field { background: #f8fafc; border-radius: 12px; padding: 12px; }
          .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
          .value { margin-top: 6px; font-size: 14px; font-weight: 700; color: #0f172a; }
        </style>
      </head>
      <body>
        <h1>${getPaymentTitle(payment.type)} Invoice</h1>
        <div class="subtitle">NextStep Talent</div>
        <div class="grid">
          <div class="field"><div class="label">Status</div><div class="value">${payment.status || '—'}</div></div>
          <div class="field"><div class="label">Amount</div><div class="value">${payment.currency || 'USD'} ${payment.amount || 0}</div></div>
          <div class="field"><div class="label">Transaction ID</div><div class="value">${payment.transactionId || '—'}</div></div>
          <div class="field"><div class="label">Method</div><div class="value">${payment.method || '—'}</div></div>
          <div class="field"><div class="label">Date</div><div class="value">${formatDate(payment.createdAt)}</div></div>
          <div class="field"><div class="label">Type</div><div class="value">${getPaymentTitle(payment.type)}</div></div>
        </div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => iframe.remove(), 1000);
  };

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
};

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    api.get('/payments/me').then(({ data }) => setPayments(Array.isArray(data) ? data : [])).catch(() => setPayments([]));
  }, []);

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
            {/* removed completed-invoices count box as requested */}
          </section>

          {!payments.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
              No payment records yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {payments.map((payment) => (
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
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={() => setSelectedPayment(payment)}>View</Button>
                    <Button variant="secondary" onClick={() => printInvoice(payment)}>Download Invoice</Button>
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
