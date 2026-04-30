import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
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
          <h1 className="text-3xl font-bold text-[#002147]">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to continue.</p>

          <form className="mt-6 space-y-4" onSubmit={loginAsAdmin}>
            <Input
              label="Admin Email"
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />

            {authError && <p className="text-sm text-rose-600">{authError}</p>}

            <div className="flex flex-wrap gap-3">
              <Button disabled={authLoading}>{authLoading ? 'Signing in...' : 'Sign In as Admin'}</Button>
              {DEFAULT_ADMIN_EMAIL && (
                <Button type="button" variant="secondary" onClick={() => setLoginForm({ ...loginForm, email: DEFAULT_ADMIN_EMAIL })}>
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
