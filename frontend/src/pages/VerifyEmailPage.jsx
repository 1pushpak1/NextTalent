import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setAuth, token } = useAuth();
  const next = params.get('next') || '/profile-submission';

  const email = user?.email || localStorage.getItem('nst_signup_email') || '';

  const markVerified = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email });
      setAuth(token, data.user);
      navigate(`/verify-phone?next=${encodeURIComponent(next)}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to verify email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout title="Email Verification" subtitle="We have sent a verification link to your registered email address.">
      <div className="space-y-3">
        <Button variant="secondary" className="w-full" onClick={() => alert('Verification email resend simulated.')}>
          Resend Verification Email
        </Button>
        <Button className="w-full" onClick={markVerified} disabled={loading}>
          {loading ? 'Verifying...' : 'Mark Email as Verified'}
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
