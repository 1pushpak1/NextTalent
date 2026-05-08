import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api/axios';
import AuthSplitLayout from '../components/AuthSplitLayout';

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const prefilledEmail = String(params.get('email') || '').trim();
  const next = params.get('next') || '/candidate-dashboard';
  const isAdminMode = String(params.get('mode') || '').toLowerCase() === 'admin' || String(next || '').startsWith('/admin');
  const [email, setEmail] = useState(prefilledEmail);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const loginHref = useMemo(
    () => (isAdminMode ? '/admin' : `/login?next=${encodeURIComponent(next)}`),
    [isAdminMode, next],
  );

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: String(email || '').toLowerCase().trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send reset email right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title={isAdminMode ? 'Admin Forgot Password' : 'Forgot Password'}
      subtitle="Enter your account email and we will send you a secure link to reset your password."
    >
      {submitted ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            If your account exists, a password reset link has been sent to your email. The link expires in 30 minutes.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="text-sm font-semibold text-[#c8a96b] transition hover:text-[#e7d5ac]" to={loginHref}>
              Back to Login
            </Link>
            <button
              type="button"
              className="text-sm font-semibold text-[#f7f3ea] underline decoration-dotted underline-offset-4"
              onClick={() => setSubmitted(false)}
            >
              Try another email
            </button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button className="w-full" disabled={loading}>
            {loading ? 'Sending reset link...' : 'Send Reset Link'}
          </Button>
          <p className="text-center text-sm text-[#bdbdc3]">
            Remembered your password?{' '}
            <Link className="font-semibold text-[#c8a96b] transition hover:text-[#e7d5ac]" to={loginHref}>
              Back to Login
            </Link>
          </p>
        </form>
      )}
    </AuthSplitLayout>
  );
}
