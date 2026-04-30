import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';
import claimEligibilityIfPresent from '../utils/claimEligibility';

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/profile-submission';
  const { isAuthenticated, setAuth } = useAuth();

  useEffect(() => {
    if (isAuthenticated) return;
    if (localStorage.getItem('nst_eligible') === 'true') return;
    navigate('/eligibility-check', { replace: true });
  }, [isAuthenticated, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return alert('Passwords do not match');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setAuth(data.token, data.user);
      localStorage.setItem('nst_signup_email', form.email);
      await claimEligibilityIfPresent();
      navigate(`/verify-email?next=${encodeURIComponent(next)}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout title="Join NextStep" subtitle="Create your candidate profile to begin the elite pathway.">
      <form className="space-y-4" onSubmit={submit}>
        <Input label="Email Address" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Input label="Confirm Password" type="password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
        <Button className="w-full" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</Button>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-[#44474e]">
        Already have an account? <Link className="font-semibold text-[#3a5f94]" to={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
      </div>
    </AuthSplitLayout>
  );
}
