import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Select from '../components/Select';
import Button from '../components/Button';
import api from '../api/axios';

export default function FinalPaymentPage() {
  const [method, setMethod] = useState('Bank Transfer preferred');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/payments/create', {
        type: 'final',
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
        <div className="mx-auto max-w-[900px] px-6">
          <section className="nst-card rounded-xl p-8">
            <h1 className="mb-2 text-4xl font-bold text-[#002147]">Final Onboarding Payment</h1>
            <p className="mb-6 text-[#44474e]">This payment is payable only upon successful selection.</p>
            <div className="mb-6 rounded-lg bg-[#f4f3f7] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Milestone 03</p>
              <p className="mt-2 text-3xl font-bold text-[#002147]">USD 4,000</p>
            </div>
            <div className="max-w-sm">
              <Select label="Payment Option" options={['Bank Transfer preferred', 'Card Payment optional']} value={method} onChange={(e) => setMethod(e.target.value)} />
            </div>
            <Button className="mt-6" onClick={submit} disabled={loading}>{loading ? 'Processing...' : 'Pay USD 4,000'}</Button>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
