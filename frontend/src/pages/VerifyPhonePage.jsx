import { useEffect, useMemo, useRef, useState } from 'react';
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
      }));
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const toOptionValue = (entry) => `${entry.iso2}:${entry.code}`;
const isoToFlag = (iso2) =>
  String(iso2 || '')
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

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
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setAuth, token } = useAuth();
  const next = params.get('next') || '/profile-submission';
  const countryWrapRef = useRef(null);
  const countryInputRef = useRef(null);

  const selectedCountry = useMemo(
    () => COUNTRY_CODE_OPTIONS.find((entry) => toOptionValue(entry) === selectedCountryValue) || COUNTRY_CODE_OPTIONS[0],
    [selectedCountryValue],
  );

  const filteredCountryOptions = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRY_CODE_OPTIONS;
    const normalizedCode = q.startsWith('+') ? q : `+${q}`;

    return COUNTRY_CODE_OPTIONS.filter((entry) => {
      const label = `${entry.name} (${entry.code})`.toLowerCase();
      return label.includes(q) || entry.code.startsWith(normalizedCode);
    });
  }, [countryQuery]);

  useEffect(() => {
    // Check if phone is already verified (page refresh case)
    if (user?.phoneVerified) {
      navigate(next);
    }
  }, [user?.phoneVerified, navigate, next]);

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

  useEffect(() => {
    if (!isCountryOpen) return;
    const onMouseDown = (event) => {
      if (!countryWrapRef.current?.contains(event.target)) {
        setIsCountryOpen(false);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isCountryOpen]);

  useEffect(() => {
    if (isCountryOpen) {
      window.setTimeout(() => countryInputRef.current?.focus(), 0);
    }
  }, [isCountryOpen]);

  const selectCountry = (entry) => {
    setSelectedCountryValue(toOptionValue(entry));
    setCountryCode(entry.code);
    setCountryQuery('');
    setIsCountryOpen(false);
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
        <div>
          <span className="mb-1.5 block text-sm font-medium text-[#d3d3d8]">Mobile Number</span>
          <div className="grid grid-cols-10 gap-3">
            <div className="relative col-span-4" ref={countryWrapRef}>
              <span className="sr-only">Country code</span>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.035)] px-3 py-2.5 text-sm text-[#f7f3ea] outline-none transition focus:border-[#c8a96b] focus:ring-2 focus:ring-[#c8a96b]/20"
                onClick={() => setIsCountryOpen((prev) => !prev)}
                aria-expanded={isCountryOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate">{`${isoToFlag(selectedCountry?.iso2)} ${selectedCountry?.name} (${selectedCountry?.code})`}</span>
                <span className="material-symbols-outlined text-base">expand_more</span>
              </button>

              {isCountryOpen && (
                <div className="absolute z-50 mt-1 w-[min(420px,calc(100vw-3rem))] rounded-lg border border-[rgba(200,169,107,0.3)] bg-[#101114] p-2 shadow-xl">
                  <input
                    ref={countryInputRef}
                    className="mb-2 w-full rounded-md border border-[rgba(200,169,107,0.25)] bg-[#18191d] px-2.5 py-2 text-sm text-[#f7f3ea] outline-none focus:border-[#c8a96b]"
                    placeholder="Type country or code (e.g. 9, +91, india)"
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsCountryOpen(false);
                      }
                    }}
                  />
                  <ul className="max-h-52 overflow-y-auto" role="listbox">
                    {filteredCountryOptions.map((entry) => {
                      const value = toOptionValue(entry);
                      const isSelected = value === selectedCountryValue;
                      return (
                        <li key={value}>
                          <button
                            type="button"
                            className={`w-full rounded-md px-2.5 py-2 text-left text-sm ${isSelected ? 'bg-[rgba(200,169,107,0.2)] text-[#f7f3ea]' : 'text-[#d7d9df] hover:bg-[rgba(255,255,255,0.07)]'}`}
                            onClick={() => selectCountry(entry)}
                          >
                            {`${isoToFlag(entry.iso2)} ${entry.name} (${entry.code})`}
                          </button>
                        </li>
                      );
                    })}
                    {!filteredCountryOptions.length && <li className="px-2.5 py-2 text-sm text-slate-400">No matches found.</li>}
                  </ul>
                </div>
              )}
            </div>

            <div className="col-span-6">
              <Input
                label=""
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>
        </div>

        <Button className="w-full" onClick={submitPhone} disabled={loading}>
          {loading ? 'Saving phone...' : 'Continue'}
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
