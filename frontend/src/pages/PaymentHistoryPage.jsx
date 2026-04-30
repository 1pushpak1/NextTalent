import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CandidatePortalSidebar from '../components/CandidatePortalSidebar';
import api from '../api/axios';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    api.get('/payments/me').then(({ data }) => setPayments(Array.isArray(data) ? data : [])).catch(() => setPayments([]));
  }, []);

  const invoices = useMemo(
    () => payments.filter((payment) => String(payment.status || '').toLowerCase() === 'completed'),
    [payments],
  );

  return (
    <div className="nst-shell">
      <Navbar />
      <CandidatePortalSidebar />

      <main className="pb-20 pt-28 lg:ml-64">
        <div className="mx-auto max-w-[1200px] px-6">
          <section className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#002147]">Payment History</h1>
              <p className="mt-2 text-base text-[#44474e]">Completed payment invoices for your pathway.</p>
            </div>
            {/* removed completed-invoices count box as requested */}
          </section>

          {!invoices.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
              No completed payments yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {invoices.map((payment) => (
                <article key={payment._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Invoice — <span className="normal-case font-semibold text-emerald-700">{String(payment.status || '')}</span></p>
                      <h2 className="mt-1 text-2xl font-bold text-[#002147]">
                        {payment.type === 'initial'
                          ? 'Initial Payment'
                          : payment.type === 'program'
                            ? 'Program Fee'
                            : 'Final Payment'}
                      </h2>
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
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="relative z-30">
        <Footer />
      </div>
    </div>
  );
}