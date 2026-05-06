import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Card from '../components/Card';
import Button from '../components/Button';
import api from '../api/axios';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const guard = async () => {
      try {
        const { data } = await api.get('/dashboard/me');
        const required = getCandidateNextRoute(data);
        if (required !== '/onboarding') {
          navigate(required, { replace: true });
          return;
        }
      } catch {
        navigate('/candidate-dashboard', { replace: true });
        return;
      } finally {
        setLoading(false);
      }
    };
    guard();
  }, [navigate]);

  const continueFlow = async () => {
    setSaving(true);
    try {
      await api.put('/dashboard/me/status', { status: 'onboarding_complete' });
      navigate('/documents');
    } catch {
      alert('Unable to update onboarding status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-6">
          <Card className="rounded-xl border border-slate-200 p-8">
            <h1 className="text-3xl font-bold text-[#002147]">Team Contact / Onboarding</h1>
            <p className="mt-3 text-[#44474e]">
              Your declaration is complete. This stage confirms onboarding coordination before document upload begins.
            </p>
            <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <p>1. Team alignment call or onboarding briefing</p>
              <p>2. Process orientation and document checklist walkthrough</p>
              <p>3. Candidate readiness confirmation for document collection</p>
            </div>
            <div className="mt-8 flex gap-3">
              <Button className="text-white" variant="secondary" onClick={() => navigate('/candidate-dashboard')}>Back to Dashboard</Button>
              <Button onClick={continueFlow} disabled={loading || saving}>{saving ? 'Saving...' : 'Continue to Document Upload'}</Button>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
