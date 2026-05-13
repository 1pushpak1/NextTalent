import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import api from '../api/axios';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

const BANK_DETAILS = {
  accountName: 'NextStep Talent Global LLC',
  accountNumber: '123456789012',
  bankName: 'Global Trust Bank',
  branch: 'Berlin Main Branch',
  swift: 'GTBKDEFFXXX',
  iban: 'DE89370400440532013000',
};

const PROGRAM_DEPOSIT_USD = 3100;

const formatUsd = (amount) => `USD ${Number(amount || 0).toLocaleString('en-US')}`;

function InfoTooltip({ text }) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-[#002147]/35 bg-white text-[11px] font-bold text-[#002147]">i</span>
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-20 w-60 -translate-x-1/2 rounded-lg border border-black/70 bg-black p-2 text-xs font-medium leading-5 text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

export default function ProgramFeePaymentPage() {
  const [loading, setLoading] = useState(false);
  const [bankReference, setBankReference] = useState('');
  const [receipt, setReceipt] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const totalProgramFee = useMemo(() => PROGRAM_DEPOSIT_USD, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const guard = async () => {
      try {
        const { data } = await api.get('/dashboard/me');
        const required = getCandidateNextRoute(data);
        if (required !== '/payment/program-fee') {
          navigate(required, { replace: true });
        }
      } catch {
        navigate('/candidate-dashboard', { replace: true });
      }
    };
    guard();
  }, [navigate]);

  const submit = async () => {
    if (!receipt) {
      alert('Please upload transfer receipt');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', 'program');
      formData.append('bankReference', bankReference);
      formData.append('receipt', receipt);
      await api.post('/payments/bank-transfer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Receipt uploaded. Admin will verify and update your payment status.');
      navigate('/candidate-dashboard');
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to submit bank transfer receipt');
    } finally {
      setLoading(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-6 lg:grid-cols-12">
          <section className="nst-card rounded-xl p-6 lg:col-span-8">
            <h1 className="mb-2 text-4xl font-bold text-[#002147]">Program Fee Payment</h1>
            <p className="mb-4 text-[#44474e]">Transfer {formatUsd(totalProgramFee)} to the account below, then upload your transfer receipt.</p>

            <div className="mb-6 rounded-xl border border-[#002147]/20 bg-[#002147]/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#002147]">Amount To Pay</p>
              <p className="mt-1 text-3xl font-extrabold text-[#002147]">{formatUsd(totalProgramFee)}</p>
              <p className="mt-1 text-sm text-slate-700">Please transfer exactly this total amount before submitting the receipt.</p>
            </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#002147]">Fee Breakdown</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">First Placement Deposit</span>
                  <span className="font-semibold text-slate-900">{formatUsd(PROGRAM_DEPOSIT_USD)}</span>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[#002147]">Total Payable</span>
                  <span className="text-xl font-extrabold text-[#002147]">{formatUsd(totalProgramFee)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Refund note: if not selected post interviews, USD 200 administrative deduction applies as per{' '}
                  <Link className="font-semibold text-[#002147] underline" to="/payment-refund-policy" target="_blank" rel="noopener noreferrer">
                    policy
                  </Link>.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-2">
              <p><b>Account Name:</b> {BANK_DETAILS.accountName}</p>
              <p><b>Account Number:</b> {BANK_DETAILS.accountNumber}</p>
              <p><b>Bank Name:</b> {BANK_DETAILS.bankName}</p>
              <p><b>Branch:</b> {BANK_DETAILS.branch}</p>
              <p><b>SWIFT:</b> {BANK_DETAILS.swift}</p>
              <p><b>IBAN:</b> {BANK_DETAILS.iban}</p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                placeholder="Bank transfer reference"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
              />
              <div className="rounded-xl border border-slate-300 bg-white p-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                />
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="secondary" className="text-white" onClick={openFilePicker}>
                    Choose File
                  </Button>
                  <span className="truncate text-xs text-slate-600">
                    {receipt?.name || 'No file selected'}
                  </span>
                </div>
              </div>
            </div>

            <Button className="mt-6 text-white" onClick={submit} disabled={loading}>{loading ? 'Submitting...' : `Submit ${formatUsd(totalProgramFee)} Receipt`}</Button>
          </section>

          <aside className="rounded-xl bg-[#002147] p-6 text-white lg:col-span-4">
            <h3 className="mb-2 text-2xl font-semibold">Status: Action Required</h3>
            <p className="text-sm text-blue-100">After receipt upload, admin verification is required to mark this payment received.</p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
