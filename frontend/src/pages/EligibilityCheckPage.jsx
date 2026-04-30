import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
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

export default function EligibilityCheckPage() {
  const [step, setStep] = useState(1);
  const [popup, setPopup] = useState('');
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
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
    setDestination(value);
    if (value === 'Europe Active') return setStep(2);
    if (value === 'United States Coming Soon') {
      setPopup('Opportunities for the United States are not open yet. Please check back on May 5th, 2026.');
      return;
    }
    setPopup('This destination is upcoming. Please check back in a future cycle.');
  };

  const submitEligibility = async () => {
    const payload = {
      destination,
      country,
      hasITBackground: answers.hasITBackground === 'Yes',
      qualification: answers.qualification,
      languageAnswer: answers.languageAnswer,
      currentLocation: answers.currentLocation,
      willingToRelocate: answers.willingToRelocate === 'Yes',
      comfortableWithFees: answers.comfortableWithFees === 'Yes',
    };

    try {
      const { data } = await api.post('/eligibility/check', payload);
      setResult(data);
      setStep(4);
      if (data.isEligible) {
        localStorage.setItem('nst_eligible', 'true');
        localStorage.setItem('nst_eligibility_id', data._id);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save eligibility');
    }
  };

  const progressSteps = ['Destination Selection', 'Country Selection', 'Quick Questions', 'Result'];
  const progress = (step / progressSteps.length) * 100;

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-[#2d476f]">
                Step {step} of {progressSteps.length}
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-[#002147]">Define Your Path</h1>
              <p className="mt-2 max-w-2xl text-base text-[#44474e]">
                Our selective process begins with destination and readiness checks for international pathway evaluation.
              </p>
            </div>
            <div className="w-full max-w-xs rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-[#002147] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {step === 1 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <button
                onClick={() => {
                  setDestination('Europe Active');
                  setStep(2);
                }}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-lg md:col-span-8"
              >
                <div className="h-80">
                  <img
                    className="h-full w-full object-cover"
                    src="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80"
                    alt="Europe"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-xs uppercase tracking-widest text-blue-100">Active Corridor</p>
                  <h2 className="text-3xl font-bold">Europe</h2>
                  <p className="mt-1 text-sm text-blue-100">Germany, Switzerland, Austria, and Poland</p>
                </div>
              </button>

              <div className="space-y-4 md:col-span-4">
                {destinations
                  .filter((d) => d !== 'Europe Active')
                  .map((item) => (
                    <button
                      key={item}
                      onClick={() => handleDestination(item)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-slate-700 transition hover:bg-slate-100"
                    >
                      <h3 className="text-lg font-semibold text-[#002147]">{item.replace(' Coming Soon', '').replace(' Upcoming', '')}</h3>
                      <p className="text-xs text-slate-500">Upcoming Corridor</p>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <Card className="nst-card rounded-xl p-6">
              <h2 className="mb-4 text-2xl font-semibold text-[#002147]">Select Your Target Country</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {countries.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCountry(c)}
                    className={`rounded-xl border p-5 text-center transition ${
                      country === c ? 'border-[#002147] bg-blue-50 text-[#002147]' : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined mb-1 block text-3xl">flag</span>
                    <span className="text-sm font-semibold">{c}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => country && setStep(3)}>Continue</Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="nst-card rounded-xl p-6">
              <h2 className="mb-4 text-2xl font-semibold text-[#002147]">Quick Eligibility Questions</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Select label="Do you have an IT background?" options={['Yes', 'No']} value={answers.hasITBackground} onChange={(e) => setAnswers({ ...answers, hasITBackground: e.target.value })} />
                <Select
                  label="Highest Qualification"
                  options={['Diploma with one year practical training', 'Bachelor’s', 'Master’s', 'Other']}
                  value={answers.qualification}
                  onChange={(e) => setAnswers({ ...answers, qualification: e.target.value })}
                />
                <Select
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
                    label="Do you know German? (Optional)"
                    options={['Yes', 'No']}
                    value={answers.knowsGerman}
                    onChange={(e) => setAnswers({ ...answers, knowsGerman: e.target.value })}
                  />
                )}
                <Select label="Current location" options={['Europe', 'Outside Europe']} value={answers.currentLocation} onChange={(e) => setAnswers({ ...answers, currentLocation: e.target.value })} />
                <Select label="Are you willing to relocate to the selected country?" options={['Yes', 'No']} value={answers.willingToRelocate} onChange={(e) => setAnswers({ ...answers, willingToRelocate: e.target.value })} />
                <Select label="Are you comfortable with program/service fees?" options={['Yes', 'No']} value={answers.comfortableWithFees} onChange={(e) => setAnswers({ ...answers, comfortableWithFees: e.target.value })} />
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={submitEligibility}>Check Result</Button>
              </div>
            </Card>
          )}

          {step === 4 && result && (
            <Card className="nst-card rounded-xl p-8 text-center">
              {result.isEligible ? (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                  </div>
                  <h2 className="mb-3 text-3xl font-bold text-[#002147]">You are initially eligible</h2>
                  <p className="mx-auto mb-6 max-w-2xl text-[#44474e]">
                    You meet the initial eligibility criteria. You may now proceed to submit your detailed profile for
                    evaluation.
                  </p>
                  <Button
                    onClick={() =>
                      navigate(isAuthenticated ? '/profile-submission' : '/signup?next=/profile-submission')
                    }
                  >
                    {isAuthenticated ? 'Continue to Profile Submission' : 'Create Candidate Account'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                    <span className="material-symbols-outlined text-3xl">cancel</span>
                  </div>
                  <h2 className="mb-3 text-3xl font-bold text-[#002147]">Not Eligible Right Now</h2>
                  <p className="mx-auto mb-6 max-w-2xl text-[#44474e]">
                    Based on your responses, you do not meet the current eligibility criteria for this program. You may
                    reapply when requirements are met or explore other destinations as they open.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button variant="secondary" onClick={() => setStep(2)}>Back to Europe Options</Button>
                    <Link to="/"><Button>Return Home</Button></Link>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </main>

      <Modal isOpen={Boolean(popup)} onClose={() => setPopup('')} title="Notice">
        <p className="text-sm text-slate-600">{popup}</p>
      </Modal>
      <Footer />
    </div>
  );
}
