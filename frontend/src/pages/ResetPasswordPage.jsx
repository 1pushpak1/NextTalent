import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api/axios';
import AuthSplitLayout from '../components/AuthSplitLayout';

const passwordChecks = (password = '') => ([
  { label: 'At least 8 characters', valid: password.length >= 8 },
  { label: 'At least 1 uppercase letter', valid: /[A-Z]/.test(password) },
  { label: 'At least 1 lowercase letter', valid: /[a-z]/.test(password) },
  { label: 'At least 1 number', valid: /\d/.test(password) },
  { label: 'At least 1 special character', valid: /[^A-Za-z0-9]/.test(password) },
]);

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = String(params.get('token') || '').trim();
  const next = params.get('next') || '/candidate-dashboard';
  const isAdminMode = String(params.get('mode') || '').toLowerCase() === 'admin' || String(next || '').startsWith('/admin');
  const loginHref = useMemo(
    () => (isAdminMode ? '/admin' : `/login?next=${encodeURIComponent(next)}`),
    [isAdminMode, next],
  );

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const checks = passwordChecks(form.newPassword);
  const strong = checks.every((item) => item.valid);
  const hasConfirm = form.confirmPassword.length > 0;
  const mismatch = hasConfirm && form.confirmPassword !== form.newPassword;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Reset link is missing or invalid.');
      return;
    }
    if (!strong) {
      setError('Please choose a stronger password.');
      return;
    }
    if (mismatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate(loginHref, { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title={isAdminMode ? 'Admin Reset Password' : 'Reset Password'}
      subtitle="Set a new secure password for your account."
    >
      {!token ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            This reset link is invalid. Please request a new password reset email.
          </p>
          <Link
            className="text-sm font-semibold text-[#c8a96b] transition hover:text-[#e7d5ac]"
            to={isAdminMode ? '/forgot-password?mode=admin&next=%2Fadmin' : '/forgot-password'}
          >
            Request New Link
          </Link>
        </div>
      ) : success ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            Password updated successfully. Redirecting to login.
          </p>
          <Link className="text-sm font-semibold text-[#c8a96b] transition hover:text-[#e7d5ac]" to={loginHref}>
            Go to Login
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Input
            label="New Password"
            type="password"
            required
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
          />
          <div className="rounded-lg border border-[rgba(200,169,107,0.28)] bg-[rgba(255,255,255,0.02)] p-3 text-xs text-[#d3d3d8]">
            {checks.map((check) => (
              <p key={check.label} className={`flex items-center gap-2 ${check.valid ? 'text-emerald-400' : 'text-rose-300'}`}>
                <span className="material-symbols-outlined text-sm">
                  {check.valid ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span>{check.label}</span>
              </p>
            ))}
          </div>
          <Input
            label="Confirm New Password"
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            error={mismatch ? 'Passwords do not match' : ''}
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button className="w-full" disabled={loading}>
            {loading ? 'Resetting password...' : 'Reset Password'}
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
