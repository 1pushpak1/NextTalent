import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Select from '../components/Select';
import Button from '../components/Button';
import api from '../api/axios';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

export default function ProgramFeePaymentPage() {
  const [method, setMethod] = useState('Bank Transfer preferred');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    setLoading(true);
    try {
      const { data } = await api.post('/payments/create', {
        type: 'program',
        method,
        returnBaseUrl: window.location.origin,
      });
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      alert('Stripe checkout URL was not returned.');
    } catch (error) {
      alert(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-6 lg:grid-cols-12">
          <section className="nst-card rounded-xl p-6 lg:col-span-8">
            <h1 className="mb-2 text-4xl font-bold text-[#002147]">Program Milestones</h1>
            <p className="mb-6 text-[#44474e]">This payment is required before document verification and partner submission begin.</p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-[#f4f3f7] p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Milestone 02</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#002147]">Placement Confirmation</h3>
                <p className="mt-2 text-sm text-[#44474e]">Program fee component + documentation verification included</p>
                <p className="mt-5 text-3xl font-bold text-[#002147]">USD 3,500</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Refund Note</p>
                <p className="mt-2 text-sm text-[#44474e]">Refundable only if not selected post interview stage.</p>
                <div className="mt-4">
                  <Select label="Payment Option" options={['Bank Transfer preferred', 'Card Payment optional']} value={method} onChange={(e) => setMethod(e.target.value)} />
                </div>
              </div>
            </div>

            <Button className="mt-6" onClick={submit} disabled={loading}>{loading ? 'Processing...' : 'Proceed to Payment'}</Button>
          </section>

          <aside className="rounded-xl bg-[#002147] p-6 text-white lg:col-span-4">
            <h3 className="mb-2 text-2xl font-semibold">Status: Action Required</h3>
            <p className="text-sm text-blue-100">Complete Milestone 02 to continue to verification and partner submission.</p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
