import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import Card from '../components/Card';
import api from '../api/axios';

export default function InternalEvaluationPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/profile/me');
      setProfile(data);
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    const timer = setInterval(loadProfile, 12000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile) return;
    if (profile.status === 'accepted') {
      navigate('/initial-payment', { replace: true });
      return;
    }
    if (profile.status === 'rejected') {
      navigate('/email-sent', { replace: true });
    }
  }, [profile, navigate]);

  const statusText = useMemo(() => {
    if (!profile) return 'No profile found for evaluation yet.';
    if (profile.status === 'accepted') return 'Accepted for next stage';
    if (profile.status === 'rejected') return 'Not accepted in this cycle';
    return 'Under Internal Evaluation';
  }, [profile]);

  return (
    <div className="nst-shell min-h-screen">
      <Navbar />
      <main className="px-6 pb-16 pt-28">
        <div className="mx-auto max-w-3xl">
          <Card className="nst-card rounded-xl border border-slate-200 p-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-[#002147]">
              <span className="material-symbols-outlined text-3xl">hourglass_top</span>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-[#002147]">Internal Evaluation</h1>
            <p className="mb-4 text-base text-[#44474e]">
              Your profile is submitted. Our internal team is reviewing candidate alignment and readiness for current
              international pathway requirements.
            </p>
            <p className="mb-8 text-sm font-semibold uppercase tracking-wide text-[#2d476f]">Status: {statusText}</p>

            {loading ? (
              <p className="text-sm text-slate-500">Checking latest status...</p>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button onClick={loadProfile}>Refresh Status</Button>
                <Button variant="secondary" onClick={() => navigate('/candidate-dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
