import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DEFAULT_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim();

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setAuth } = useAuth();
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const [loginForm, setLoginForm] = useState({ email: DEFAULT_ADMIN_EMAIL, password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdmin, navigate]);

  const loginAsAdmin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const { data } = await api.post('/auth/login', loginForm);
      if (data.user?.role !== 'admin') {
        setAuthError('This account is not an admin account.');
        return;
      }
      setAuth(data.token, data.user);
      navigate('/admin/dashboard', { replace: true });
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Admin login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  if (isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
        <Card className="w-full rounded-xl border border-slate-200 p-8">
          <h1 className="text-3xl font-bold text-black">Admin Login</h1>
          <p className="mt-2 text-sm text-black">Sign in to continue.</p>

          <form className="mt-6 space-y-4" onSubmit={loginAsAdmin}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-black">
                Admin Email
              </span>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-black outline-none transition placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-black">
                Password
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-11 text-sm text-black outline-none transition placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-700 transition hover:text-black"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                      <path d="M9.53 5.11A10.94 10.94 0 0112 5c5.05 0 9.27 3.11 11 7a13.16 13.16 0 01-1.67 2.68" />
                      <path d="M6.71 6.72A11.86 11.86 0 002 12c1.73 3.89 5.95 7 10 7a10.94 10.94 0 005.29-1.28" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </span>
            </label>

            {authError && <p className="text-sm text-rose-600">{authError}</p>}

            <div className="flex flex-wrap gap-3">
              <Button variant="adminPrimary" className="text-black" disabled={authLoading}>{authLoading ? 'Signing in...' : 'Sign In as Admin'}</Button>
              {DEFAULT_ADMIN_EMAIL && (
                <Button type="button" variant="adminSecondary" className="text-black" onClick={() => setLoginForm({ ...loginForm, email: DEFAULT_ADMIN_EMAIL })}>
                  Use Env Email
                </Button>
              )}
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
