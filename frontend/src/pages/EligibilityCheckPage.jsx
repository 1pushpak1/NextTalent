import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const destinations = [
  'Europe Active',
  'United States Coming Soon',
  'United Kingdom Upcoming',
  'Spain Upcoming',
  'Italy Upcoming',
];
const countries = ['Germany', 'Switzerland', 'Austria', 'Poland'];
const eligibilityBurstPieces = [
  { left: '16%', delay: '0ms', duration: '2350ms', rotate: '-18deg', color: '#f59e0b' },
  { left: '24%', delay: '120ms', duration: '2550ms', rotate: '22deg', color: '#ef4444' },
  { left: '33%', delay: '60ms', duration: '2280ms', rotate: '-12deg', color: '#10b981' },
  { left: '42%', delay: '180ms', duration: '2620ms', rotate: '16deg', color: '#3b82f6' },
  { left: '50%', delay: '0ms', duration: '2450ms', rotate: '-6deg', color: '#8b5cf6' },
  { left: '58%', delay: '200ms', duration: '2580ms', rotate: '18deg', color: '#ec4899' },
  { left: '67%', delay: '90ms', duration: '2380ms', rotate: '-22deg', color: '#14b8a6' },
  { left: '76%', delay: '160ms', duration: '2520ms', rotate: '12deg', color: '#f97316' },
  { left: '84%', delay: '40ms', duration: '2300ms', rotate: '-16deg', color: '#eab308' },
];

export default function EligibilityCheckPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [inactiveCorridor, setInactiveCorridor] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [answers, setAnswers] = useState({
    hasITBackground: '',
    qualification: '',
    languageAnswer: '',
    knowsGerman: '',
    currentLocation: '',
    willingToRelocate: '',
    comfortableWithFees: '',
  });
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const languageOptions = useMemo(() => {
    if (country === 'Switzerland') {
      return [
        'German B2 certified or above',
        'French B2 certified or above',
        'Italian B2 certified or above',
        'No',
      ];
    }
    return ['Yes', 'No'];
  }, [country]);

  const handleDestination = (value) => {
    if (!value) return;
    if (value === 'Europe Active') {
      setDestination(value);
      setStep(3);
      return;
    }
    setInactiveCorridor(value.replace(' Coming Soon', '').replace(' Upcoming', ''));
  };

  const areAllRequiredAnswersFilled = useMemo(() => {
    const baseRequired = [
      answers.hasITBackground,
      answers.languageAnswer,
      answers.currentLocation,
      answers.willingToRelocate,
      answers.comfortableWithFees,
    ];

    if (country === 'Germany') baseRequired.push(answers.qualification);
    return baseRequired.every((value) => Boolean(value && String(value).trim()));
  }, [answers, country]);

  const submitEligibility = async () => {
    if (checkingEligibility) return;
    setCheckingEligibility(true);
    const normalizedEmail = String(email || '').toLowerCase().trim();
    // If either of these critical checks is not a Yes, short-circuit as not eligible
    if (answers.willingToRelocate !== 'Yes' || answers.comfortableWithFees !== 'Yes') {
      setResult({
        isEligible: false,
        rejectionReason: 'You must be willing to relocate and accept program/service fees to be eligible.',
      });
      setStep(5);
      setCheckingEligibility(false);
      return;
    }

    const payload = {
      email: normalizedEmail,
      destination,
      country,
      hasITBackground: answers.hasITBackground === 'Yes',
      qualification: country === 'Germany' ? answers.qualification : '',
      languageAnswer: answers.languageAnswer,
      currentLocation: answers.currentLocation,
      ...(answers.willingToRelocate ? { willingToRelocate: answers.willingToRelocate === 'Yes' } : {}),
      ...(answers.comfortableWithFees ? { comfortableWithFees: answers.comfortableWithFees === 'Yes' } : {}),
    };

    try {
      const { data } = await api.post('/eligibility/check', payload);
      setResult(data);
      setStep(5);
      if (data.isEligible) {
        localStorage.setItem('nst_eligible', 'true');
        localStorage.setItem('nst_eligibility_id', data._id);
        localStorage.setItem('nst_eligibility_email', normalizedEmail);
      }
    } catch (error) {
      setResult({
        isEligible: false,
        rejectionReason: error.response?.data?.message || 'Unable to evaluate eligibility right now.',
      });
      setStep(5);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const progressSteps = ['Email', 'Destination Selection', 'Country Selection', 'Quick Questions', 'Result'];
  const progress = (step / progressSteps.length) * 100;

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-[1200px] px-6">
          {isAuthenticated ? (
            <Card className="nst-card mx-auto max-w-3xl rounded-xl p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-emerald-50">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
              </div>
              <h1 className="nst-display text-3xl font-bold text-white">Eligibility Already Completed</h1>
              <p className="mx-auto mt-3 max-w-2xl text-[#d1d2d7]">
                You are already logged in, which means your initial eligibility step is already completed. You can continue your application from your profile or dashboard.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button onClick={() => navigate('/profile-submission')}>Go to Profile Submission</Button>
                <Button
                  variant="secondary"
                  className="bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
                  onClick={() => navigate('/candidate-dashboard')}
                >
                  Go to Dashboard
                </Button>
              </div>
            </Card>
          ) : (
            <>
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="mb-2 inline-block rounded-full border border-[rgba(200,169,107,0.45)] bg-[rgba(200,169,107,0.16)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#f4dfb2]">
                Step {step} of {progressSteps.length}
              </span>
              <h1 className="nst-display text-4xl font-bold tracking-tight text-white">Where would you like to work?</h1>
              <p className="mt-2 max-w-2xl text-base text-[#d1d2d7]">
                Our selective process begins with destination and readiness checks for international pathway evaluation.
              </p>
            </div>
            <div className="w-full max-w-xs rounded-full bg-[rgba(255,255,255,0.15)]">
              <div className="h-2 rounded-full bg-[#c8a96b] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {step === 1 && (
            <Card className="nst-card mx-auto max-w-2xl rounded-xl p-6">
              <h2 className="mb-4 nst-display text-2xl font-semibold text-white">Enter your email to begin</h2>
              <Input
                required
                type="email"
                label="Email Address"
                value={email}
                error={emailError}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="you@example.com"
              />
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => {
                    const normalized = String(email || '').toLowerCase().trim();
                    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
                    if (!isValid) {
                      setEmailError('Please enter a valid email address.');
                      return;
                    }
                    setEmailError('');
                    setEmail(normalized);
                    setStep(2);
                  }}
                >
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-6">
              <button
                onClick={() => {
                  setDestination('Europe Active');
                  setStep(3);
                }}
                className="relative overflow-hidden rounded-xl border border-[rgba(200,169,107,0.28)] bg-[rgba(255,255,255,0.04)] text-left shadow-sm transition hover:shadow-[0_0_26px_rgba(200,169,107,0.18)] w-full"
              >
                <div className="h-80">
                  <img
                    className="h-full w-full object-cover"
                    src="/europe.png"
                    alt="Europe"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-xs uppercase tracking-widest text-[#f4dfb2]">Currently Serviciing</p>
                  <h2 className="nst-display text-3xl font-bold">Europe</h2>
                  <p className="mt-1 text-sm text-[#f4dfb2]">Germany, Switzerland, Austria, and Poland</p>
                </div>
              </button>

              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#c8a96b]">Upcoming</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {destinations
                    .filter((d) => d !== 'Europe Active')
                    .map((item) => (
                      <button
                        key={item}
                        onClick={() => handleDestination(item)}
                        className="w-full rounded-xl border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.03)] p-4 text-left text-[#d8d9de] transition hover:bg-[rgba(255,255,255,0.06)]"
                      >
                        <h3 className="nst-display text-xl font-semibold text-white">{item.replace(' Coming Soon', '').replace(' Upcoming', '')}</h3>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <Card className="nst-card rounded-xl p-6">
              <h2 className="mb-4 nst-display text-2xl font-semibold text-white">Choose your preferred country</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {countries.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCountry(c)}
                    className={`rounded-xl border p-5 text-center transition ${
                      country === c
                        ? 'border-[#c8a96b] bg-[rgba(200,169,107,0.18)] text-[#f4dfb2]'
                        : 'border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.03)] text-[#d7d8dd]'
                    }`}
                  >
                    <span className="material-symbols-outlined mb-1 block text-3xl">flag</span>
                    <span className="text-sm font-semibold">{c}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  variant="secondary"
                  className="bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button className="border-[#c8a96b] bg-[#c8a96b] text-black hover:bg-[#d4b87e]" onClick={() => country && setStep(4)}>
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card className="nst-card rounded-xl p-6">
              <h2 className="mb-4 nst-display text-2xl font-semibold text-white">Quick Eligibility Questions</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Select required label="Do you have an IT background? (Software, Data, Cloud, AI, Cybersecurity, etc.)" options={['Yes', 'No']} value={answers.hasITBackground} onChange={(e) => setAnswers({ ...answers, hasITBackground: e.target.value })} />
                {country === 'Germany' && (
                  <Select
                    required
                    label="Highest Qualification"
                    options={['Diploma with one year practical training', 'Bachelor’s', 'Master’s']}
                    value={answers.qualification}
                    onChange={(e) => setAnswers({ ...answers, qualification: e.target.value })}
                  />
                )}
                <Select
                  required
                  label={
                    country === 'Switzerland'
                      ? 'Do you have certified B2 or above in German, French, or Italian?'
                      : country === 'Poland'
                        ? 'Do you have professional English proficiency?'
                        : 'Do you have certified German B2 or above?'
                  }
                  options={languageOptions}
                  value={answers.languageAnswer}
                  onChange={(e) => setAnswers({ ...answers, languageAnswer: e.target.value })}
                />
                {country === 'Poland' && (
                  <Select
                    label="Do you know German?"
                    options={['Yes', 'No']}
                    value={answers.knowsGerman}
                    onChange={(e) => setAnswers({ ...answers, knowsGerman: e.target.value })}
                  />
                )}
                <Select required label="Current location" options={['Europe', 'Outside Europe']} value={answers.currentLocation} onChange={(e) => setAnswers({ ...answers, currentLocation: e.target.value })} />
                <Select required label="Are you willing to relocate to the selected country?" options={['Yes', 'No']} value={answers.willingToRelocate} onChange={(e) => setAnswers({ ...answers, willingToRelocate: e.target.value })} />
                <Select required label="Are you comfortable with program/service fees for processing?" options={['Yes', 'No']} value={answers.comfortableWithFees} onChange={(e) => setAnswers({ ...answers, comfortableWithFees: e.target.value })} />
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  variant="secondary"
                  className="bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
                  onClick={() => setStep(3)}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (checkingEligibility) return;
                    if (!areAllRequiredAnswersFilled) {
                      setShowValidationError(true);
                      return;
                    }
                    setShowValidationError(false);
                    submitEligibility();
                  }}
                  disabled={!areAllRequiredAnswersFilled || checkingEligibility}
                >
                  {checkingEligibility ? 'Checking...' : 'Check Eligibility'}
                </Button>
              </div>
              {showValidationError && (
                <p className="mt-4 text-sm text-[#f4b3b3]">
                  Please answer all Quick Eligibility Questions before checking eligibility.
                </p>
              )}
            </Card>
          )}

          {step === 5 && result && (
            <Card className="nst-card relative overflow-hidden rounded-xl p-8 text-center">
              {result.isEligible ? (
                <>
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="nst-burst-glow absolute left-1/2 top-6 h-24 w-24 -translate-x-1/2 rounded-full" />
                    {eligibilityBurstPieces.map((piece, index) => (
                      <span
                        key={index}
                        className="nst-burst-piece absolute h-4 w-2 rounded-full"
                        style={{
                          left: piece.left,
                          backgroundColor: piece.color,
                          '--nst-burst-rotate': piece.rotate,
                          animationDelay: piece.delay,
                          animationDuration: piece.duration,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-emerald-50">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                  </div>
                  <h2 className="mb-3 nst-display text-3xl font-bold text-[#002147]">You are initially eligible</h2>
                  <p className="mx-auto mb-6 max-w-2xl text-[#44474e]">
                    You meet the initial eligibility criteria. You may now proceed to submit your detailed profile for
                    evaluation.
                  </p>
                  <Button
                    className="border-[#c8a96b] bg-[#c8a96b] text-black hover:bg-[#d4b87e]"
                    onClick={() =>
                      navigate('/profile-submission')
                    }
                  >
                    Continue
                  </Button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-red-50">
                    <span className="material-symbols-outlined text-3xl">cancel</span>
                  </div>
                  <h2 className="mb-3 nst-display text-3xl font-bold text-[#002147]">Not Eligible Right Now</h2>
                  <p className="mx-auto mb-6 max-w-2xl text-[#44474e]">
                    {result.rejectionReason || 'Based on your responses, you do not meet the current eligibility criteria for this program.'}
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="secondary"
                      className="bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
                      onClick={() => setStep(3)}
                    >
                      Back to Europe Options
                    </Button>
                    <Link to="/"><Button>Return Home</Button></Link>
                  </div>
                </>
              )}
            </Card>
          )}
            </>
          )}
        </div>

        {!isAuthenticated && inactiveCorridor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-6">
            <div className="w-full max-w-md rounded-xl border border-[rgba(200,169,107,0.32)] bg-[#071225] p-6 text-white shadow-2xl">
              <h3 className="nst-display text-2xl font-semibold">{inactiveCorridor}</h3>
              <p className="mt-3 text-sm leading-6 text-[#d1d2d7]">
                Opening soon. Please check back later.              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  className="border-[#c8a96b] bg-[#c8a96b] text-black hover:bg-[#d4b87e]"
                  onClick={() => setInactiveCorridor('')}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
