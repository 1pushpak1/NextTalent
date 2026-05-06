import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setAuth, token } = useAuth();
  const next = params.get('next') || '/profile-submission';
  const verificationToken = params.get('token') || '';

  const email = user?.email || localStorage.getItem('nst_signup_email') || '';

  const verifyUsingToken = async () => {
    if (!verificationToken) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { token: verificationToken });
      setAuth(token, data.user);
      navigate(`/verify-phone?next=${encodeURIComponent(next)}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to verify email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyUsingToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationToken]);

  const resendVerificationEmail = async () => {
    if (!email) {
      alert('Unable to find your email. Please login again.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/resend-verification-email', { email });
      alert('Verification email sent. Please check your inbox.');
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout title="Email Verification" subtitle="We have sent a verification link to your registered email address. Open it to continue.">
      <div className="space-y-3">
        <button
          type="button"
          className="w-full rounded-xl border border-[rgba(200,169,107,0.5)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#c8a96b] underline decoration-[#c8a96b]/60 underline-offset-4 transition hover:bg-[rgba(200,169,107,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={resendVerificationEmail}
          disabled={loading}
        >
          Resend Verification Email
        </button>
      </div>
    </AuthSplitLayout>
  );
}
