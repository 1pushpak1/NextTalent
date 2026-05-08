import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';
import claimEligibilityIfPresent from '../utils/claimEligibility';

export default function SignupPage() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [lockedEligibilityEmail, setLockedEligibilityEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordPopupPlacement, setPasswordPopupPlacement] = useState('bottom');
  const passwordFieldRef = useRef(null);
  const passwordPopupRef = useRef(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/profile-submission';
  const { isAuthenticated, setAuth } = useAuth();

  useEffect(() => {
    if (isAuthenticated) return;
    if (localStorage.getItem('nst_eligible') === 'true') return;
    navigate('/eligibility-check', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const emailFromEligibility = String(localStorage.getItem('nst_eligibility_email') || '').toLowerCase().trim();
    if (!emailFromEligibility) return;
    setLockedEligibilityEmail(emailFromEligibility);
    setForm((prev) => ({ ...prev, email: emailFromEligibility }));
  }, []);

  useEffect(() => {
    if (!isPasswordFocused) return;

    const updatePasswordPopupPlacement = () => {
      const fieldRect = passwordFieldRef.current?.getBoundingClientRect();
      const popupRect = passwordPopupRef.current?.getBoundingClientRect();
      if (!fieldRect || !popupRect) return;

      const gutter = 16;
      const hasRoomOnRight = window.innerWidth - fieldRect.right >= popupRect.width + gutter;
      setPasswordPopupPlacement(hasRoomOnRight ? 'right' : 'bottom');
    };

    updatePasswordPopupPlacement();
    window.addEventListener('resize', updatePasswordPopupPlacement);

    return () => {
      window.removeEventListener('resize', updatePasswordPopupPlacement);
    };
  }, [isPasswordFocused]);

  const passwordChecks = [
    { label: 'At least 8 characters', valid: form.password.length >= 8 },
    { label: 'At least 1 uppercase letter', valid: /[A-Z]/.test(form.password) },
    { label: 'At least 1 lowercase letter', valid: /[a-z]/.test(form.password) },
    { label: 'At least 1 number', valid: /\d/.test(form.password) },
    { label: 'At least 1 special character', valid: /[^A-Za-z0-9]/.test(form.password) },
  ];

  const hasPassword = form.password.length > 0;
  const isPasswordStrong = passwordChecks.every((check) => check.valid);
  const hasConfirmPassword = form.confirmPassword.length > 0;
  const passwordsMatch = hasConfirmPassword && form.password === form.confirmPassword;
  const passwordsMismatch = hasConfirmPassword && form.password !== form.confirmPassword;

  const submit = async (e) => {
    e.preventDefault();
    const normalizedEmail = String(form.email || '').toLowerCase().trim();
    if (lockedEligibilityEmail && normalizedEmail !== lockedEligibilityEmail) {
      return alert('Please use the same email used during eligibility check.');
    }
    if (!isPasswordStrong) return alert('Please choose a stronger password');
    if (form.password !== form.confirmPassword) return alert('Passwords do not match');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { ...form, email: normalizedEmail });
      setAuth(data.token, data.user);
      localStorage.setItem('nst_signup_email', normalizedEmail);
      localStorage.removeItem('nst_eligibility_email');
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
        <div>
          <Input
            label="Email Address"
            type="email"
            required
            value={form.email}
            readOnly={Boolean(lockedEligibilityEmail)}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {lockedEligibilityEmail && (
            <p className="mt-1 text-xs text-[#d3d3d8]">
              {/* This email is locked to your eligibility check email. */}
            </p>
          )}
        </div>
        <div className="relative z-[100]" ref={passwordFieldRef}>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
            inputClassName={
              hasPassword
                ? isPasswordStrong
                  ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20'
                  : 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : ''
            }
            rightIcon={
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="inline-flex items-center text-[#d3d3d8] transition hover:text-white"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                {hasPassword ? (
                  isPasswordStrong ? (
                    <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px] text-rose-600">cancel</span>
                  )
                ) : null}
              </span>
            }
            inputClassName="pr-20"
            aria-invalid={hasPassword && !isPasswordStrong}
          />
          {isPasswordFocused && !isPasswordStrong && (
            <div
              ref={passwordPopupRef}
              className={`absolute z-[9999] rounded-xl border border-[rgba(200,169,107,0.3)] bg-[#080808] p-3 text-xs text-white shadow-[0_18px_45px_rgba(0,0,0,0.55)] ${
                passwordPopupPlacement === 'right'
                  ? 'left-full top-0 ml-4 w-72'
                  : 'left-0 right-0 top-full mt-2'
              }`}
            >
              <div className="mb-2 font-medium text-white">Password must include:</div>
              <div className="space-y-1">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={`flex items-center gap-2 ${check.valid ? 'text-emerald-700' : 'text-rose-600'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {check.valid ? 'check_circle' : 'cancel'}
                    </span>
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          required
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          inputClassName={
            `${passwordsMatch
              ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20'
              : passwordsMismatch
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : ''} pr-20`
          }
          rightIcon={
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="inline-flex items-center text-[#d3d3d8] transition hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
              {passwordsMatch ? (
                <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
              ) : passwordsMismatch ? (
                <span className="material-symbols-outlined text-[20px] text-rose-600">cancel</span>
              ) : null}
            </span>
          }
          aria-invalid={passwordsMismatch}
        />
        <Button className="w-full" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</Button>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-[#44474e]">
        Already have an account? <Link className="font-semibold text-[#3a5f94]" to={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
      </div>
    </AuthSplitLayout>
  );
}
