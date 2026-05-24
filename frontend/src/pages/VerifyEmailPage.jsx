import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setAuth, token } = useAuth();
  const next = params.get('next') || '/profile-submission';

  const email = user?.email || localStorage.getItem('nst_signup_email') || '';

  const verifyUsingCode = async () => {
    if (!email) {
      alert('Unable to find your email. Please login again.');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      alert('Enter a valid 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, code: code.trim() });
      const persistedToken = localStorage.getItem('nst_token') || '';
      const nextToken = data?.token || token || persistedToken;
      if (nextToken) {
        setAuth(nextToken, data.user);
      } else {
        localStorage.setItem('nst_user', JSON.stringify(data.user || null));
      }

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
    }
  }, [user?.emailVerified, user?.phoneVerified, next, navigate]);

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
    <AuthSplitLayout title="Email Verification" subtitle="We have sent a verification code to your registered email address. Enter it to continue.">
      <div className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full rounded-xl border border-[rgba(200,169,107,0.35)] bg-[rgba(255,255,255,0.05)] px-4 py-2.5 text-sm text-white placeholder:text-white/60 outline-none transition focus:border-[rgba(200,169,107,0.8)]"
          placeholder="Enter 6-digit code"
          disabled={loading}
        />
        <button
          type="button"
          className="w-full rounded-xl bg-[#c8a96b] px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#d8b87a] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={verifyUsingCode}
          disabled={loading}
        >
          Verify Email
        </button>
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
