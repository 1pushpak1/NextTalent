import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { countries } from 'countries-list';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/AuthSplitLayout';

const COUNTRY_CODE_OPTIONS = Object.entries(countries)
  .flatMap(([iso2, details]) => {
    const dialings = Array.isArray(details.phone) ? details.phone : String(details.phone || '').split(',');

    return dialings
      .map((dialing) => String(dialing || '').trim())
      .filter(Boolean)
      .map((dialing) => ({
        iso2,
        name: details.name,
        code: `+${dialing}`,
        label: `${details.name} (${`+${dialing}`})`,
      }));
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const toOptionValue = (entry) => `${entry.iso2}:${entry.code}`;

const findByCountryName = (countryName) => {
  if (!countryName) return null;
  const normalized = String(countryName).trim().toLowerCase();
  return COUNTRY_CODE_OPTIONS.find((entry) => entry.name.toLowerCase() === normalized) || null;
};

export default function VerifyPhonePage() {
  const [countryCode, setCountryCode] = useState('+1');
  const [selectedCountryValue, setSelectedCountryValue] = useState('US:+1');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setAuth, token } = useAuth();
  const next = params.get('next') || '/profile-submission';

  useEffect(() => {
    const eligibilityId = localStorage.getItem('nst_eligibility_id');
    if (!eligibilityId) return;

    api
      .get(`/eligibility/${eligibilityId}`)
      .then(({ data }) => {
        const match = findByCountryName(data?.country);
        if (!match) return;
        setSelectedCountryValue(toOptionValue(match));
        setCountryCode(match.code);
      })
      .catch(() => {});
  }, []);

  const selectedLabel = useMemo(() => {
    const current = COUNTRY_CODE_OPTIONS.find((entry) => toOptionValue(entry) === selectedCountryValue);
    return current ? current.label : '';
  }, [selectedCountryValue]);

  const handleCountryChange = (event) => {
    const nextValue = event.target.value;
    const selected = COUNTRY_CODE_OPTIONS.find((entry) => toOptionValue(entry) === nextValue);
    if (!selected) return;
    setSelectedCountryValue(nextValue);
    setCountryCode(selected.code);
  };

  const submitPhone = async () => {
    if (!phone.trim()) {
      alert('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-phone', {
        email: user?.email,
        countryCode,
        phone: phone.trim(),
      });
      setAuth(token, data.user);
      navigate(next);
    } catch (error) {
      alert(error.response?.data?.message || 'Phone verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout title="Phone Verification" subtitle="Enter your mobile number with country code to continue.">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#d3d3d8]">Country Code</span>
          <select
            className="w-full rounded-lg border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.035)] px-3 py-2.5 text-sm text-[#f7f3ea] outline-none transition focus:border-[#c8a96b] focus:ring-2 focus:ring-[#c8a96b]/20"
            value={selectedCountryValue}
            onChange={handleCountryChange}
          >
            {COUNTRY_CODE_OPTIONS.map((entry) => (
              <option key={toOptionValue(entry)} value={toOptionValue(entry)}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <Input label="Selected Code" value={countryCode} readOnly />
        <Input
          label="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter mobile number"
        />

        <p className="text-xs text-[#bdbdc3]">
          Default country code is auto-selected from yWhat We Doed country: {selectedLabel || 'Not available'}.
        </p>

        <Button className="w-full" onClick={submitPhone} disabled={loading}>
          {loading ? 'Saving phone...' : 'Continue'}
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
