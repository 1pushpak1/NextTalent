import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import api from '../api/axios';

const contentByType = {
  initial: {
    message: 'Thank you. Your initial evaluation payment of USD 500 has been received.',
    cta: '/declaration',
    label: 'Proceed to Declaration',
  },
  program: {
    message: 'Thank you. Your program fee payment has been received.',
    cta: '/candidate-dashboard',
    label: 'Go to Dashboard',
  },
  final: {
    message: 'Thank you. Your final payment has been received.',
    cta: '/testimonial',
    label: 'Share Testimonial',
  },
};

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const type = params.get('type') || 'initial';
  const sessionId = params.get('session_id') || '';
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(4);
  const c = contentByType[type] || contentByType.initial;
  const confirmKey = useMemo(() => `confirmed_${sessionId}`, [sessionId]);
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      if (!sessionId) return;
      if (localStorage.getItem(confirmKey) === '1') {
        setConfirmed(true);
        return;
      }
      try {
        setConfirming(true);
        await api.post('/payments/confirm', { sessionId, type, method: 'card' });
        localStorage.setItem(confirmKey, '1');
        setConfirmed(true);
      } catch (error) {
        console.error('Payment confirmation failed:', error?.response?.data || error.message);
      } finally {
        setConfirming(false);
      }
    };
    run();
  }, [sessionId, type, confirmKey]);

  useEffect(() => {
    if (type !== 'initial' || !confirmed || confirming) return;
    setRedirectCountdown(4);
    const countdownTimer = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(countdownTimer);
          navigate(c.cta, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, [c.cta, confirmed, confirming, navigate, type]);

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-2xl px-6">
          <div className="nst-card rounded-xl p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <h1 className="mb-3 text-3xl font-bold text-[#002147]">Payment Successful</h1>
            <p className="mb-6 text-[#44474e]">{c.message}</p>
            {confirming && <p className="mb-4 text-sm text-slate-500">Confirming payment record...</p>}
            {!confirming && sessionId && confirmed && <p className="mb-4 text-sm text-emerald-700">Payment record confirmed.</p>}
            {!confirming && type === 'initial' && confirmed && (
              <p className="mb-4 text-sm text-[#44474e]">Redirecting in {redirectCountdown}s...</p>
            )}
            <Link to={c.cta}><Button>{c.label}</Button></Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
