import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';

export default function VerifyPhonePage() {
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setAuth, token } = useAuth();
  const next = params.get('next') || '/profile-submission';

  const sendOtp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-phone-otp', { email: user?.email, countryCode, phone });
      setOtpSent(true);
      alert('OTP sent. Demo OTP: 123456');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-phone', { email: user?.email, otp });
      setAuth(token, data.user);
      navigate(next);
    } catch (error) {
      alert(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout title="Phone Verification" subtitle="Verification Required: confirm your phone with OTP to continue.">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Country Code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
        <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <Button className="mt-4 w-full" onClick={sendOtp} disabled={loading}>Send OTP</Button>

      {otpSent && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Input label="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
          <Button className="mt-3 w-full" onClick={verifyOtp} disabled={loading}>Verify OTP</Button>
        </div>
      )}
    </AuthSplitLayout>
  );
}
