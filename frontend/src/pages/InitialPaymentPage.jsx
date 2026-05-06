import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import api from '../api/axios';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

export default function InitialPaymentPage() {
  const [readyForCheckout, setReadyForCheckout] = useState(false);
  const [redirectError, setRedirectError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const redirectToStripeCheckout = async () => {
    setLoading(true);
    setRedirectError('');
    try {
      const { data } = await api.post('/payments/create', {
        type: 'initial',
        method: 'card',
        returnBaseUrl: window.location.origin,
      });
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setRedirectError('Stripe checkout URL was not returned.');
    } catch (error) {
      setRedirectError(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const guard = async () => {
      try {
        const { data } = await api.get('/dashboard/me');
        const required = getCandidateNextRoute(data);
        if (required !== '/initial-payment') {
          navigate(required, { replace: true });
          return;
        }

        setReadyForCheckout(true);
      } catch {
        navigate('/candidate-dashboard', { replace: true });
      }
    };
    guard();
  }, [navigate]);

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="nst-mesh pt-28 pb-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-10 text-center">
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#002147]">Secure Your Pathway</h1>
            <p className="mx-auto max-w-2xl text-[#44474e]">
              This payment confirms your participation in the initial evaluation stage of the NextStep Talent process.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="nst-card rounded-xl p-6 lg:col-span-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#002147]">Initial Evaluation Fee</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Non-refundable</span>
              </div>

              <p className="rounded-lg bg-white p-4 text-sm text-[#44474e] ring-1 ring-slate-200">
                You will be redirected to Stripe Checkout to enter card and billing details securely.
              </p>

              <p className="mt-4 rounded-lg bg-[#f4f3f7] p-3 text-sm text-black">
                This fee supports evaluation and process coordination services. It does not promise employment outcomes.
              </p>

              {redirectError && (
                <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  {redirectError}
                </p>
              )}

              <Button className="mt-5 w-full" onClick={redirectToStripeCheckout} disabled={loading || !readyForCheckout}>
                {loading ? 'Redirecting to Stripe...' : 'Continue to Secure Stripe Checkout'}
              </Button>
            </div>

            <aside className="space-y-4 lg:col-span-5">
              <div className="nst-card rounded-xl p-6">
                <h3 className="mb-4 text-xl font-semibold text-[#002147]">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#44474e]">Initial Evaluation Fee</span><span className="font-semibold text-[#002147]">USD 500.00</span></div>
                  <div className="flex justify-between"><span className="text-[#44474e]">Gateway Charges</span><span className="text-[#3a5f94]">As applicable</span></div>
                  <div className="mt-3 flex items-end justify-between border-t border-slate-200 pt-3">
                    <span className="text-sm text-[#44474e]">Total</span>
                    <span className="text-3xl font-bold text-[#002147]">USD 500</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-[#002147] p-6 text-white">
                <h4 className="mb-2 text-xl font-semibold">What's Next?</h4>
                <ul className="space-y-2 text-sm text-blue-100">
                  <li>Declaration and contract signing</li>
                  <li>Document collection stage</li>
                  <li>Internal and partner review workflow</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
