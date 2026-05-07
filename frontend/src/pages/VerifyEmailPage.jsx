import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
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
      const persistedToken = localStorage.getItem('nst_token') || '';
      const nextToken = data?.token || token || persistedToken;
      setAuth(nextToken, data.user);

      if (data?.user?.phoneVerified) {
        navigate(next, { replace: true });
      } else {
        navigate(`/verify-phone?next=${encodeURIComponent(next)}`, { replace: true });
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to verify email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.emailVerified) {
      if (user?.phoneVerified) {
        navigate(next, { replace: true });
      } else {
        navigate(`/verify-phone?next=${encodeURIComponent(next)}`, { replace: true });
      }
      return;
    }

    if (verificationToken) {
      verifyUsingToken();
    }
  }, [verificationToken, user?.emailVerified, user?.phoneVerified, next, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timerId = window.setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [cooldown]);

  const resendVerificationEmail = async () => {
    if (!email) {
      alert('Unable to find your email. Please login again.');
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    try {
      await api.post('/auth/resend-verification-email', { email });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      alert('Verification email sent. Please check your inbox.');
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout title="Email Verification" subtitle="We have sent a verification link to your registered email address. Open it to continue.">
      <div className="space-y-4">
        <div className="rounded-xl border border-[rgba(200,169,107,0.2)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#d9d9de]">
          If you do not receive the email in your inbox, please check your spam or junk folder.
        </div>
        <button
          type="button"
          className="w-full rounded-xl border border-[rgba(200,169,107,0.5)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#c8a96b] underline decoration-[#c8a96b]/60 underline-offset-4 transition hover:bg-[rgba(200,169,107,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={resendVerificationEmail}
          disabled={loading || cooldown > 0}
        >
          {cooldown > 0 ? `Resend again in ${cooldown}s` : 'Resend Verification Email'}
        </button>
      </div>
    </AuthSplitLayout>
  );
}
