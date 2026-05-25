import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import api from '../api/axios';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

export default function ProgramFeePaymentPage() {
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
            <h1 className="text-3xl font-bold text-[#002147]">Program Fee Payment</h1>
            <p className="mt-3 text-sm text-[#44474e]">
              Payment instructions are sent by email once the admin opens this step for your profile.
              Complete the transfer using those email instructions and send your receipt by email reply only.
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
