import { useEffect, useState } from 'react';
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
  const [resendCountdown, setResendCountdown] = useState(0);

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setAuth, token } = useAuth();
  const next = params.get('next') || '/profile-submission';

  useEffect(() => {
    if (!otpSent || resendCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpSent, resendCountdown]);

  const sendOtp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-phone-otp', { email: user?.email, countryCode, phone });
      setOtpSent(true);
      setResendCountdown(60);
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

  const formatCountdown = (seconds) => {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const remainingSeconds = String(seconds % 60).padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  };

  return (
    <AuthSplitLayout title="Phone Verification" subtitle="Confirm your phone with OTP to continue.">
      <div className="flex gap-3">
        <div className="w-1/5 min-w-[84px]">
          <Input label="Code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
        </div>
        <div className="flex-1">
          <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      {!otpSent && <Button className="mt-4 w-full" onClick={sendOtp} disabled={loading}>Send OTP</Button>}

      {otpSent && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Input label="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
          <div className="mt-3 text-center text-sm text-[#44474e]">
            {resendCountdown > 0 ? (
              <>
                Resend OTP in <span className="font-bold text-[#002147]">{formatCountdown(resendCountdown)}</span>
              </>
            ) : (
              <span
                className="cursor-pointer font-semibold text-[#3a5f94]"
                onClick={sendOtp}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') sendOtp();
                }}
                role="button"
                tabIndex={0}
              >
                Resend OTP
              </span>
            )}
          </div>
          <Button className="mt-3 w-full" onClick={verifyOtp} disabled={loading}>Verify OTP</Button>
        </div>
      )}
    </AuthSplitLayout>
  );
}
