import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';
import claimEligibilityIfPresent from '../utils/claimEligibility';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/candidate-dashboard';
  const { setAuth } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.token, data.user);
      await claimEligibilityIfPresent();
      if (data.user?.role === 'admin') {
        navigate('/admin');
        return;
      }
      if (!data.user?.emailVerified) {
        navigate(`/verify-email?next=${encodeURIComponent(next)}`);
      } else if (!data.user?.phoneVerified) {
        navigate(`/verify-phone?next=${encodeURIComponent(next)}`);
      } else {
        navigate(next);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout title="Welcome Back" subtitle="Access your candidate portal and continue your pathway milestones.">
      <form className="space-y-4" onSubmit={submit}>
        <Input label="Email Address" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button className="w-full" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
      </form>
    </AuthSplitLayout>
  );
}
