import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import api from '../api/axios';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

export default function FinalPaymentPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const guard = async () => {
      try {
        const { data } = await api.get('/dashboard/me');
        const required = getCandidateNextRoute(data);
        if (required !== '/candidate-dashboard') {
          navigate(required, { replace: true });
        }
      } catch {
        navigate('/candidate-dashboard', { replace: true });
      }
    };
    guard();
  }, [navigate]);

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-3xl px-6">
          <section className="nst-card rounded-xl p-8">
            <h1 className="text-3xl font-bold text-[#002147]">Final Payment</h1>
            <p className="mt-3 text-sm text-[#44474e]">
              Final payment instructions are sent by email after your selection is confirmed.
              Complete the transfer using the shared bank details and send your receipt by email reply only.
            </p>
            <div className="mt-6">
              <Link to="/candidate-dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
