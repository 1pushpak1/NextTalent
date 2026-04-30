import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import SignatureModal from '../components/SignatureModal';
import CandidatePortalSidebar from '../components/CandidatePortalSidebar';
import api from '../api/axios';

const formSteps = ['Personal', 'Education', 'Certifications', 'Experience', 'Skills', 'Languages', 'Additional', 'Review'];
const monthYearRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
const formatMonthYearInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};
const formatYearInput = (value) => value.replace(/\D/g, '').slice(0, 4);
const monthYearToNumber = (value) => {
  if (!monthYearRegex.test(value)) return null;
  const [month, year] = value.split('/').map(Number);
  return year * 12 + month;
};
const getCurrentMonthNumber = () => {
  const now = new Date();
  return now.getFullYear() * 12 + (now.getMonth() + 1);
};
const isEndBeforeStart = (startDate, endDate) => {
  const start = monthYearToNumber(startDate);
  const end = monthYearToNumber(endDate);
  return start !== null && end !== null && end <= start;
};
const isEndAfterCurrentMonth = (endDate) => {
  const end = monthYearToNumber(endDate);
  if (end === null) return false;
  return end > getCurrentMonthNumber();
};
const getEducationDateOrderError = (education) => {
  const pairs = [
    { label: 'High school', startDate: education.highSchool.startDate, endDate: education.highSchool.endDate },
    { label: 'Diploma', startDate: education.diploma.startDate, endDate: education.diploma.endDate },
    { label: "Bachelor's", startDate: education.bachelors.startDate, endDate: education.bachelors.endDate },
    { label: "Master's", startDate: education.masters.startDate, endDate: education.masters.endDate },
  ];

  for (const pair of pairs) {
    if (pair.startDate && pair.endDate && isEndBeforeStart(pair.startDate, pair.endDate)) {
      return `${pair.label} end date must be after start date.`;
    }
  }

  for (let i = 0; i < education.additionalQualifications.length; i += 1) {
    const item = education.additionalQualifications[i];
    if (item.startDate && item.endDate && isEndBeforeStart(item.startDate, item.endDate)) {
      return `Additional qualification ${i + 1} end date must be after start date.`;
    }
  }

  return null;
};
const getEducationFutureEndDateError = (education) => {
  const pairs = [
    { label: 'High school', endDate: education.highSchool.endDate },
    { label: 'Diploma', endDate: education.diploma.endDate },
    { label: "Bachelor's", endDate: education.bachelors.endDate },
    { label: "Master's", endDate: education.masters.endDate },
  ];

  for (const pair of pairs) {
    if (pair.endDate && isEndAfterCurrentMonth(pair.endDate)) {
      return `${pair.label} end date cannot be in the future.`;
    }
  }

  for (let i = 0; i < education.additionalQualifications.length; i += 1) {
    const item = education.additionalQualifications[i];
    if (item.endDate && isEndAfterCurrentMonth(item.endDate)) {
      return `Additional qualification ${i + 1} end date cannot be in the future.`;
    }
  }

  return null;
};
const getWorkDateOrderError = (workExperience) => {
  for (let i = 0; i < workExperience.length; i += 1) {
    const item = workExperience[i];
    if (item.currentlyWorkingHere) continue;
    if (item.startDate && item.endDate && isEndBeforeStart(item.startDate, item.endDate)) {
      return `Work experience ${i + 1} end date must be after start date.`;
    }
  }
  return null;
};
const getWorkFutureEndDateError = (workExperience) => {
  for (let i = 0; i < workExperience.length; i += 1) {
    const item = workExperience[i];
    if (item.currentlyWorkingHere) continue;
    if (item.endDate && isEndAfterCurrentMonth(item.endDate)) {
      return `Work experience ${i + 1} end date cannot be in the future.`;
    }
  }
  return null;
};

const blankQualification = () => ({ qualificationName: '', field: '', startDate: '', endDate: '', country: '' });
const blankCertification = () => ({ certificationName: '', issuingOrganization: '', yearCompleted: '' });
const blankWork = () => ({ organizationName: '', jobTitle: '', responsibilities: '', startDate: '', endDate: '', currentlyWorkingHere: false, country: '' });
const blankLanguage = () => ({ language: '', proficiencyLevel: '', certified: 'No', certificateTitle: '' });
const createDefaultForm = () => ({
  personalDetails: {
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    countryOfBirth: '',
    citizenship: '',
    currentCountryOfResidence: '',
    currentVisaStatus: '',
    email: '',
  },
  education: {
    highSchool: { startDate: '', endDate: '', track: '', country: '' },
    diploma: { notApplicable: false, duration: '', hasTraining: '', startDate: '', endDate: '', field: '', country: '' },
    bachelors: { startDate: '', endDate: '', field: '', country: '' },
    masters: { notApplicable: true, startDate: '', endDate: '', field: '', country: '' },
    additionalQualifications: [blankQualification()],
  },
  certifications: [blankCertification()],
  workExperience: [blankWork()],
  skills: { technical: '', soft: '' },
  languages: [blankLanguage()],
  additionalInfo: '',
});
const normalizeArray = (items, fallbackFactory) => (Array.isArray(items) && items.length ? items : [fallbackFactory()]);
const hydrateFormFromProfile = (profile) => {
  const defaults = createDefaultForm();
  const profileEducation = profile?.education || {};

  return {
    personalDetails: { ...defaults.personalDetails, ...(profile?.personalDetails || {}) },
    education: {
      ...defaults.education,
      ...profileEducation,
      highSchool: { ...defaults.education.highSchool, ...(profileEducation.highSchool || {}) },
      diploma: { ...defaults.education.diploma, ...(profileEducation.diploma || {}) },
      bachelors: { ...defaults.education.bachelors, ...(profileEducation.bachelors || {}) },
      masters: { ...defaults.education.masters, ...(profileEducation.masters || {}) },
      additionalQualifications: normalizeArray(profileEducation.additionalQualifications, blankQualification).map((q) => ({
        ...blankQualification(),
        ...(q || {}),
      })),
    },
    certifications: normalizeArray(profile?.certifications, blankCertification).map((c) => ({
      ...blankCertification(),
      ...(c || {}),
    })),
    workExperience: normalizeArray(profile?.workExperience, blankWork).map((w) => ({
      ...blankWork(),
      ...(w || {}),
    })),
    skills: { ...defaults.skills, ...(profile?.skills || {}) },
    languages: normalizeArray(profile?.languages, blankLanguage).map((lang) => ({
      ...blankLanguage(),
      ...(lang || {}),
    })),
    additionalInfo: profile?.additionalInfo || '',
  };
};

export default function ProfileSubmissionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [financialAccepted, setFinancialAccepted] = useState(false);
  const [showAckModal, setShowAckModal] = useState(false);
  const [signature, setSignature] = useState(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [isApprovedProfileView, setIsApprovedProfileView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [technicalSkillInput, setTechnicalSkillInput] = useState('');
  const navigate = useNavigate();

  const [form, setForm] = useState(createDefaultForm);

  useEffect(() => {
    let isMounted = true;

    const loadExistingProfile = async () => {
      try {
        const { data: existingProfile } = await api.get('/profile/me');
        if (!isMounted) return;

        if (existingProfile) {
          setHasExistingProfile(true);
          setIsApprovedProfileView(existingProfile.status === 'accepted');
          setForm(hydrateFormFromProfile(existingProfile));
          setFinancialAccepted(Boolean(existingProfile.financialDisclosureAccepted));
          setSignature(existingProfile.signature || null);
          setCurrentStep(8);
          setShowFinancialModal(false);
          return;
        }

        setHasExistingProfile(false);
        setIsApprovedProfileView(false);
        setShowFinancialModal(true);
      } catch {
        if (!isMounted) return;
        setIsApprovedProfileView(false);
        setShowFinancialModal(true);
      }
    };

    loadExistingProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const requireVisa =
    form.personalDetails.currentCountryOfResidence &&
    form.personalDetails.citizenship &&
    form.personalDetails.currentCountryOfResidence !== form.personalDetails.citizenship;

  const fullName = `${form.personalDetails.firstName} ${form.personalDetails.lastName}`.trim();
  const signedDateTime = new Date().toLocaleString();
  const acknowledgementText = `By proceeding with this submission, you confirm that all information provided by you is true, accurate, and complete to the best of your knowledge.

You understand that this information will be used for evaluation, verification, and alignment with international opportunities as part of the NextStep Talent process.

You acknowledge that any incorrect, misleading, or incomplete information may impact your eligibility or progression within the program.

By signing below, you accept full responsibility for the authenticity of the details submitted.`;

  const allDatesValid = useMemo(() => {
    const highSchoolDates = [form.education.highSchool.startDate, form.education.highSchool.endDate];
    const diplomaDates = [form.education.diploma.startDate, form.education.diploma.endDate];
    const bachelorsDates = [form.education.bachelors.startDate, form.education.bachelors.endDate];
    const mastersDates = [form.education.masters.startDate, form.education.masters.endDate];
    const additionalDates = form.education.additionalQualifications.flatMap((q) => [q.startDate, q.endDate]);
    const certYears = form.certifications.map((c) => c.yearCompleted).filter(Boolean);
    const workDates = form.workExperience.flatMap((w) => [w.startDate, w.endDate]).filter(Boolean);
    return [...highSchoolDates, ...diplomaDates, ...bachelorsDates, ...mastersDates, ...additionalDates, ...workDates].every((d) => !d || monthYearRegex.test(d)) && certYears.every((y) => /^\d{4}$/.test(y));
  }, [form]);
  const technicalSkills = useMemo(
    () => form.skills.technical.split(',').map((skill) => skill.trim()).filter(Boolean),
    [form.skills.technical],
  );
  const getLanguagesError = (languages) => {
    if (!languages[0]?.language || !languages[0]?.proficiencyLevel) {
      return 'Please complete at least one language proficiency entry.';
    }

    for (let i = 0; i < languages.length; i += 1) {
      const item = languages[i];
      const touched = item.language || item.proficiencyLevel || item.certificateTitle || item.certified === 'Yes';
      if (!touched) continue;

      if (!item.language || !item.proficiencyLevel) {
        return `Please complete language and proficiency for language entry ${i + 1}.`;
      }
      if (item.certified === 'Yes' && !item.certificateTitle.trim()) {
        return `Certificate title is required for certified language entry ${i + 1}.`;
      }
    }

    return null;
  };
  const addTechnicalSkill = () => {
    const nextSkill = technicalSkillInput.trim();
    if (!nextSkill) return;

    const exists = technicalSkills.some((skill) => skill.toLowerCase() === nextSkill.toLowerCase());
    if (exists) {
      setTechnicalSkillInput('');
      return;
    }

    updateSection('skills', {
      ...form.skills,
      technical: [...technicalSkills, nextSkill].join(', '),
    });
    setTechnicalSkillInput('');
  };
  const removeTechnicalSkill = (skillToRemove) => {
    updateSection('skills', {
      ...form.skills,
      technical: technicalSkills.filter((skill) => skill !== skillToRemove).join(', '),
    });
  };

  const validateRequired = () => {
    if (!financialAccepted) return 'Financial disclosure acceptance is required.';
    if (!form.personalDetails.firstName || !form.personalDetails.lastName) return 'First and last name are required.';
    if (!form.personalDetails.dateOfBirth || !form.personalDetails.countryOfBirth || !form.personalDetails.citizenship) return 'Complete personal details are required.';
    if (requireVisa && !form.personalDetails.currentVisaStatus) return 'Current visa status is required.';
    if (!form.education.highSchool.startDate || !form.education.highSchool.endDate) return 'High school dates are required.';
    if (form.education.diploma.notApplicable && (!form.education.bachelors.startDate || !form.education.bachelors.endDate || !form.education.bachelors.field)) {
      return "Bachelor's details are required when diploma is not applicable.";
    }
    if (!allDatesValid) return 'Use MM/YYYY format for dates and YYYY for certification year.';
    const educationDateOrderError = getEducationDateOrderError(form.education);
    if (educationDateOrderError) return educationDateOrderError;
    const educationFutureEndDateError = getEducationFutureEndDateError(form.education);
    if (educationFutureEndDateError) return educationFutureEndDateError;
    const workDateOrderError = getWorkDateOrderError(form.workExperience);
    if (workDateOrderError) return workDateOrderError;
    const workFutureEndDateError = getWorkFutureEndDateError(form.workExperience);
    if (workFutureEndDateError) return workFutureEndDateError;
    if (form.education.additionalQualifications.length > 3) return 'Additional qualifications max is 3.';
    if (form.certifications.length > 10) return 'Certifications max is 10.';
    if (form.workExperience.length > 10) return 'Work experience max is 10.';
    if (!signature?.value) return 'Acknowledgement signature is required.';
    return null;
  };

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      const p = form.personalDetails;
      if (!p.firstName || !p.lastName || !p.dateOfBirth || !p.countryOfBirth || !p.citizenship || !p.currentCountryOfResidence) {
        return 'Please complete all mandatory personal details before continuing.';
      }
      if (requireVisa && !p.currentVisaStatus) {
        return 'Current visa status is required when residence and citizenship differ.';
      }
      if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
        return 'Please enter a valid email format.';
      }
      return null;
    }

    if (currentStep === 2) {
      const e = form.education;
      if (!e.highSchool.startDate || !e.highSchool.endDate || !e.highSchool.track || !e.highSchool.country) {
        return 'Please complete all mandatory high school fields.';
      }
      if (!monthYearRegex.test(e.highSchool.startDate) || !monthYearRegex.test(e.highSchool.endDate)) {
        return 'Use MM/YYYY format for high school dates.';
      }

      if (!e.diploma.notApplicable) {
        if (!e.diploma.duration || !e.diploma.hasTraining || !e.diploma.startDate || !e.diploma.endDate || !e.diploma.field || !e.diploma.country) {
          return 'Please complete all diploma fields or mark diploma as not applicable.';
        }
      } else {
        if (!e.bachelors.startDate || !e.bachelors.endDate || !e.bachelors.field || !e.bachelors.country) {
          return "Bachelor's details are mandatory when diploma is not applicable.";
        }
      }

      const datePool = [
        e.diploma.startDate,
        e.diploma.endDate,
        e.bachelors.startDate,
        e.bachelors.endDate,
        e.masters.startDate,
        e.masters.endDate,
        ...e.additionalQualifications.flatMap((q) => [q.startDate, q.endDate]),
      ].filter(Boolean);

      if (!datePool.every((d) => monthYearRegex.test(d))) {
        return 'Use MM/YYYY format for education dates.';
      }
      const educationDateOrderError = getEducationDateOrderError(e);
      if (educationDateOrderError) {
        return educationDateOrderError;
      }
      const educationFutureEndDateError = getEducationFutureEndDateError(e);
      if (educationFutureEndDateError) {
        return educationFutureEndDateError;
      }
      if (e.additionalQualifications.length > 3) {
        return 'Additional qualifications max is 3.';
      }
      return null;
    }

    if (currentStep === 3) {
      if (form.certifications.length > 10) return 'Certifications max is 10.';
      for (const cert of form.certifications) {
        const touched = cert.certificationName || cert.issuingOrganization || cert.yearCompleted;
        if (touched) {
          if (!cert.certificationName || !cert.issuingOrganization || !cert.yearCompleted) {
            return 'Please complete all fields for each certification entry.';
          }
          if (!/^\d{4}$/.test(cert.yearCompleted)) {
            return 'Certification year must be in YYYY format.';
          }
        }
      }
      return null;
    }

    if (currentStep === 4) {
      if (form.workExperience.length > 10) return 'Work experience max is 10.';
      const first = form.workExperience[0];
      if (!first.organizationName || !first.jobTitle || !first.responsibilities || !first.startDate || !first.country) {
        return 'Please complete the first work experience entry before continuing.';
      }
      if (!monthYearRegex.test(first.startDate)) {
        return 'Use MM/YYYY format for work start date.';
      }
      if (!first.currentlyWorkingHere) {
        if (!first.endDate) return 'End date is required unless currently working here is checked.';
        if (!monthYearRegex.test(first.endDate)) return 'Use MM/YYYY format for work end date.';
      }
      const workDateOrderError = getWorkDateOrderError(form.workExperience);
      if (workDateOrderError) {
        return workDateOrderError;
      }
      const workFutureEndDateError = getWorkFutureEndDateError(form.workExperience);
      if (workFutureEndDateError) {
        return workFutureEndDateError;
      }
      return null;
    }

    if (currentStep === 5) {
      if (!technicalSkills.length) {
        return 'Technical skills are mandatory.';
      }
      return null;
    }

    if (currentStep === 6) {
      return getLanguagesError(form.languages);
    }

    return null;
  };

  const handleNext = () => {
    const error = validateCurrentStep();
    if (error) return alert(error);
    setCurrentStep((s) => s + 1);
  };

  const submitProfile = async () => {
    const error = validateRequired();
    if (error) return alert(error);
    const languagesError = getLanguagesError(form.languages);
    if (languagesError) return alert(languagesError);

    setLoading(true);
    try {
      const payload = {
        ...form,
        financialDisclosureAccepted: financialAccepted,
        acknowledgementSigned: true,
        signature: {
          ...(signature || {}),
          fullName,
          signedAt: new Date().toISOString(),
          location: 'Auto-captured placeholder',
        },
      };

      if (hasExistingProfile) {
        await api.put('/profile/me', payload);
      } else {
        await api.post('/profile', payload);
      }
      navigate('/internal-evaluation');
    } catch (err) {
      alert(err.response?.data?.message || 'Profile submission failed');
    } finally {
      setLoading(false);
      setShowAckModal(false);
    }
  };

  const updateSection = (section, value) => setForm((prev) => ({ ...prev, [section]: value }));
  const reviewValue = (value) => {
    if (value === null || value === undefined) return 'Not provided';
    if (typeof value === 'string' && !value.trim()) return 'Not provided';
    return value;
  };

  return (
    <div className="nst-shell min-h-screen">
      <Navbar />
      <CandidatePortalSidebar />
      <main className="px-6 pb-16 pt-28 lg:ml-64">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col gap-6 lg:flex-row">
            {!isApprovedProfileView && (
              <aside className="w-full lg:w-1/4">
                <div className="nst-card sticky top-28 rounded-xl border border-slate-200 p-5">
                  <h3 className="mb-4 text-xl font-semibold text-[#002147]">Application Progress</h3>
                  <div className="space-y-3">
                    {formSteps.map((stepName, idx) => {
                      const stepNo = idx + 1;
                      const active = stepNo === currentStep;
                      const done = stepNo < currentStep;
                      return (
                        <div key={stepName} className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-green-600 text-white' : active ? 'bg-blue-100 text-[#002147]' : 'bg-slate-200 text-slate-600'}`}>
                            {stepNo}
                          </span>
                          <span className={`text-sm ${active ? 'font-semibold text-[#002147]' : 'text-slate-600'}`}>{stepName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </aside>
            )}

            <div className={isApprovedProfileView ? 'w-full' : 'w-full lg:w-3/4'}>
              <Card className="nst-card border border-slate-200 rounded-xl p-6">
                <h1 className="text-3xl font-bold text-[#002147]">{isApprovedProfileView ? 'Profile Information' : 'Profile Submission'}</h1>
                <p className="mb-4 mt-2 text-sm text-[#44474e]">
                  {isApprovedProfileView
                    ? 'Your profile has been approved. Details are shown below in read-only mode.'
                    : 'Complete all sections carefully. Precision in your profile supports faster evaluation.'}
                </p>

          {currentStep === 1 && (
            <div className="grid gap-3 md:grid-cols-2">
              <Input required label="First Name as per passport" value={form.personalDetails.firstName} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, firstName: e.target.value })} />
              <Input label="Middle Name (optional)" value={form.personalDetails.middleName} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, middleName: e.target.value })} />
              <Input required label="Last Name as per passport" value={form.personalDetails.lastName} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, lastName: e.target.value })} />
              <Input required label="Date of Birth" type="date" value={form.personalDetails.dateOfBirth} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, dateOfBirth: e.target.value })} />
              <Input required label="Country of Birth" value={form.personalDetails.countryOfBirth} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, countryOfBirth: e.target.value })} />
              <Input required label="Citizenship" value={form.personalDetails.citizenship} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, citizenship: e.target.value })} />
              <Input required label="Current Country of Residence" value={form.personalDetails.currentCountryOfResidence} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, currentCountryOfResidence: e.target.value })} />
              <Input label="Email" type="email" value={form.personalDetails.email} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, email: e.target.value })} />
              {requireVisa && <Input required label="Current Visa Status" value={form.personalDetails.currentVisaStatus} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, currentVisaStatus: e.target.value })} />}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <Input required label="High School Start (MM/YYYY)" value={form.education.highSchool.startDate} onChange={(e) => updateSection('education', { ...form.education, highSchool: { ...form.education.highSchool, startDate: formatMonthYearInput(e.target.value) } })} placeholder="MM/YYYY" maxLength={7} inputMode="numeric" />
                <Input required label="High School End (MM/YYYY)" value={form.education.highSchool.endDate} onChange={(e) => updateSection('education', { ...form.education, highSchool: { ...form.education.highSchool, endDate: formatMonthYearInput(e.target.value) } })} placeholder="MM/YYYY" maxLength={7} inputMode="numeric" />
                <Select required label="Academic Track" value={form.education.highSchool.track} onChange={(e) => updateSection('education', { ...form.education, highSchool: { ...form.education.highSchool, track: e.target.value } })} options={['Science', 'Commerce', 'Arts', 'Other']} />
                <Input required label="High School Country" value={form.education.highSchool.country} onChange={(e) => updateSection('education', { ...form.education, highSchool: { ...form.education.highSchool, country: e.target.value } })} />
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.education.diploma.notApplicable}
                    onChange={(e) =>
                      updateSection('education', {
                        ...form.education,
                        diploma: { ...form.education.diploma, notApplicable: e.target.checked },
                      })
                    }
                  />
                  Diploma Not Applicable
                </label>
                {!form.education.diploma.notApplicable && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Select
                      required
                      label="Diploma Duration"
                      options={['3-Year Diploma', 'Other']}
                      value={form.education.diploma.duration}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          diploma: { ...form.education.diploma, duration: e.target.value },
                        })
                      }
                    />
                    <Select
                      required
                      label="Includes 1-year training"
                      options={['Yes', 'No']}
                      value={form.education.diploma.hasTraining}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          diploma: { ...form.education.diploma, hasTraining: e.target.value },
                        })
                      }
                    />
                    <Input
                      required
                      label="Diploma Start (MM/YYYY)"
                      placeholder="MM/YYYY"
                      maxLength={7}
                      inputMode="numeric"
                      value={form.education.diploma.startDate}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          diploma: { ...form.education.diploma, startDate: formatMonthYearInput(e.target.value) },
                        })
                      }
                    />
                    <Input
                      required
                      label="Diploma End (MM/YYYY)"
                      placeholder="MM/YYYY"
                      maxLength={7}
                      inputMode="numeric"
                      value={form.education.diploma.endDate}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          diploma: { ...form.education.diploma, endDate: formatMonthYearInput(e.target.value) },
                        })
                      }
                    />
                    <Input
                      required
                      label="Diploma Field of Study"
                      value={form.education.diploma.field}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          diploma: { ...form.education.diploma, field: e.target.value },
                        })
                      }
                    />
                    <Input
                      required
                      label="Diploma Country"
                      value={form.education.diploma.country}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          diploma: { ...form.education.diploma, country: e.target.value },
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <h3 className="font-semibold text-slate-900">Bachelor's</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input
                    required={form.education.diploma.notApplicable}
                    label="Bachelor's Start (MM/YYYY)"
                    placeholder="MM/YYYY"
                    maxLength={7}
                    inputMode="numeric"
                    value={form.education.bachelors.startDate}
                    onChange={(e) =>
                      updateSection('education', {
                        ...form.education,
                        bachelors: { ...form.education.bachelors, startDate: formatMonthYearInput(e.target.value) },
                      })
                    }
                  />
                  <Input
                    required={form.education.diploma.notApplicable}
                    label="Bachelor's End (MM/YYYY)"
                    placeholder="MM/YYYY"
                    maxLength={7}
                    inputMode="numeric"
                    value={form.education.bachelors.endDate}
                    onChange={(e) =>
                      updateSection('education', {
                        ...form.education,
                        bachelors: { ...form.education.bachelors, endDate: formatMonthYearInput(e.target.value) },
                      })
                    }
                  />
                  <Input
                    required={form.education.diploma.notApplicable}
                    label="Bachelor's Field of Study"
                    value={form.education.bachelors.field}
                    onChange={(e) =>
                      updateSection('education', {
                        ...form.education,
                        bachelors: { ...form.education.bachelors, field: e.target.value },
                      })
                    }
                  />
                  <Input
                    required={form.education.diploma.notApplicable}
                    label="Bachelor's Country"
                    value={form.education.bachelors.country}
                    onChange={(e) =>
                      updateSection('education', {
                        ...form.education,
                        bachelors: { ...form.education.bachelors, country: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.education.masters.notApplicable}
                    onChange={(e) =>
                      updateSection('education', {
                        ...form.education,
                        masters: { ...form.education.masters, notApplicable: e.target.checked },
                      })
                    }
                  />
                  Master's Not Applicable
                </label>
                {!form.education.masters.notApplicable && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Input
                      label="Master's Start (MM/YYYY)"
                      placeholder="MM/YYYY"
                      maxLength={7}
                      inputMode="numeric"
                      value={form.education.masters.startDate}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          masters: { ...form.education.masters, startDate: formatMonthYearInput(e.target.value) },
                        })
                      }
                    />
                    <Input
                      label="Master's End (MM/YYYY)"
                      placeholder="MM/YYYY"
                      maxLength={7}
                      inputMode="numeric"
                      value={form.education.masters.endDate}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          masters: { ...form.education.masters, endDate: formatMonthYearInput(e.target.value) },
                        })
                      }
                    />
                    <Input
                      label="Master's Field of Study"
                      value={form.education.masters.field}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          masters: { ...form.education.masters, field: e.target.value },
                        })
                      }
                    />
                    <Input
                      label="Master's Country"
                      value={form.education.masters.country}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          masters: { ...form.education.masters, country: e.target.value },
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">Additional Qualifications (max 3)</h3>
                {form.education.additionalQualifications.map((q, idx) => (
                  <div key={idx} className="mt-3 grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
                    <Input label="Qualification Name" value={q.qualificationName} onChange={(e) => {
                      const next = [...form.education.additionalQualifications];
                      next[idx].qualificationName = e.target.value;
                      updateSection('education', { ...form.education, additionalQualifications: next });
                    }} />
                    <Input label="Field" value={q.field} onChange={(e) => {
                      const next = [...form.education.additionalQualifications];
                      next[idx].field = e.target.value;
                      updateSection('education', { ...form.education, additionalQualifications: next });
                    }} />
                    <Input label="Start (MM/YYYY)" maxLength={7} inputMode="numeric" value={q.startDate} onChange={(e) => {
                      const next = [...form.education.additionalQualifications];
                      next[idx].startDate = formatMonthYearInput(e.target.value);
                      updateSection('education', { ...form.education, additionalQualifications: next });
                    }} />
                    <Input label="End (MM/YYYY)" maxLength={7} inputMode="numeric" value={q.endDate} onChange={(e) => {
                      const next = [...form.education.additionalQualifications];
                      next[idx].endDate = formatMonthYearInput(e.target.value);
                      updateSection('education', { ...form.education, additionalQualifications: next });
                    }} />
                  </div>
                ))}
                <Button className="mt-3" variant="secondary" onClick={() => {
                  if (form.education.additionalQualifications.length >= 3) return;
                  updateSection('education', { ...form.education, additionalQualifications: [...form.education.additionalQualifications, blankQualification()] });
                }}>
                  Add Qualification
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h3 className="font-semibold text-slate-900">Certifications (max 10)</h3>
              {form.certifications.map((c, idx) => (
                <div key={idx} className="relative mt-3 grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-3">
                  {idx > 0 && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        updateSection(
                          'certifications',
                          form.certifications.filter((_, certIdx) => certIdx !== idx),
                        );
                      }}
                      aria-label="Remove certification"
                    >
                      x
                    </button>
                  )}
                  <Input label="Certification Name" value={c.certificationName} onChange={(e) => {
                    const next = [...form.certifications];
                    next[idx].certificationName = e.target.value;
                    updateSection('certifications', next);
                  }} />
                  <Input label="Issuing Organization / Platform" value={c.issuingOrganization} onChange={(e) => {
                    const next = [...form.certifications];
                    next[idx].issuingOrganization = e.target.value;
                    updateSection('certifications', next);
                  }} />
                  <Input label="Year Completed" value={c.yearCompleted} onChange={(e) => {
                    const next = [...form.certifications];
                    next[idx].yearCompleted = formatYearInput(e.target.value);
                    updateSection('certifications', next);
                  }} placeholder="YYYY" maxLength={4} inputMode="numeric" />
                </div>
              ))}
              <Button className="mt-3" variant="secondary" onClick={() => {
                if (form.certifications.length >= 10) return;
                updateSection('certifications', [...form.certifications, blankCertification()]);
              }}>
                Add Certification
              </Button>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h3 className="font-semibold text-slate-900">Work Experience / Internships (max 10)</h3>
              {form.workExperience.map((w, idx) => (
                <div key={idx} className="mt-3 grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
                  <Input required={idx === 0} label="Organization Name" value={w.organizationName} onChange={(e) => {
                    const next = [...form.workExperience];
                    next[idx].organizationName = e.target.value;
                    updateSection('workExperience', next);
                  }} />
                  <Input required={idx === 0} label="Job Title" value={w.jobTitle} onChange={(e) => {
                    const next = [...form.workExperience];
                    next[idx].jobTitle = e.target.value;
                    updateSection('workExperience', next);
                  }} />
                  <Input required={idx === 0} label="Key Responsibilities" value={w.responsibilities} onChange={(e) => {
                    const next = [...form.workExperience];
                    next[idx].responsibilities = e.target.value;
                    updateSection('workExperience', next);
                  }} />
                  <Input required={idx === 0} label="Country" value={w.country} onChange={(e) => {
                    const next = [...form.workExperience];
                    next[idx].country = e.target.value;
                    updateSection('workExperience', next);
                  }} />
                  <Input required={idx === 0} label="Start Date (MM/YYYY)" maxLength={7} inputMode="numeric" value={w.startDate} onChange={(e) => {
                    const next = [...form.workExperience];
                    next[idx].startDate = formatMonthYearInput(e.target.value);
                    updateSection('workExperience', next);
                  }} />
                  {!w.currentlyWorkingHere && (
                    <Input required={idx === 0} label="End Date (MM/YYYY)" maxLength={7} inputMode="numeric" value={w.endDate} onChange={(e) => {
                      const next = [...form.workExperience];
                      next[idx].endDate = formatMonthYearInput(e.target.value);
                      updateSection('workExperience', next);
                    }} />
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={w.currentlyWorkingHere}
                      onChange={(e) => {
                        const next = [...form.workExperience];
                        next[idx].currentlyWorkingHere = e.target.checked;
                        if (e.target.checked) {
                          next[idx].endDate = '';
                        }
                        updateSection('workExperience', next);
                      }}
                    />
                    Currently Working Here
                  </label>
                </div>
              ))}
              <Button className="mt-3" variant="secondary" onClick={() => {
                if (form.workExperience.length >= 10) return;
                updateSection('workExperience', [...form.workExperience, blankWork()]);
              }}>
                Add Experience
              </Button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Technical Skills<span className="text-rose-600">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/15"
                    value={technicalSkillInput}
                    onChange={(e) => setTechnicalSkillInput(e.target.value)}
                    placeholder="Type a skill"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTechnicalSkill();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTechnicalSkill} className="px-4" aria-label="Add skill">
                    +
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {technicalSkills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-[#002147]">
                      {skill}
                      <button
                        type="button"
                        className="text-[#002147] hover:text-rose-700"
                        onClick={() => removeTechnicalSkill(skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <Input
                label="Soft Skills (optional)"
                value={form.skills.soft}
                onChange={(e) => updateSection('skills', { ...form.skills, soft: e.target.value })}
              />
            </div>
          )}

          {currentStep === 6 && (
            <div>
              {form.languages.map((lang, idx) => (
                <div key={idx} className="relative mt-3 space-y-3 rounded-xl border border-slate-200 p-3">
                  {idx > 0 && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        updateSection(
                          'languages',
                          form.languages.filter((_, langIdx) => langIdx !== idx),
                        );
                      }}
                      aria-label="Remove language"
                    >
                      x
                    </button>
                  )}
                  <Input required={idx === 0} label="Language" value={lang.language} onChange={(e) => {
                    const next = [...form.languages];
                    next[idx].language = e.target.value;
                    updateSection('languages', next);
                  }} />
                  <Select
                    required={idx === 0}
                    label="Proficiency Level"
                    options={['Basic', 'Intermediate', 'Advance']}
                    value={lang.proficiencyLevel}
                    onChange={(e) => {
                      const next = [...form.languages];
                      next[idx].proficiencyLevel = e.target.value;
                      updateSection('languages', next);
                    }}
                  />
                  <Select
                    label="Certified"
                    options={['Yes', 'No']}
                    value={lang.certified}
                    onChange={(e) => {
                      const next = [...form.languages];
                      next[idx].certified = e.target.value;
                      if (e.target.value !== 'Yes') {
                        next[idx].certificateTitle = '';
                      }
                      updateSection('languages', next);
                    }}
                  />
                  {lang.certified === 'Yes' && (
                    <Input
                      required
                      label="Certificate Title"
                      value={lang.certificateTitle}
                      onChange={(e) => {
                        const next = [...form.languages];
                        next[idx].certificateTitle = e.target.value;
                        updateSection('languages', next);
                      }}
                    />
                  )}
                </div>
              ))}
              <Button className="mt-3" variant="secondary" onClick={() => updateSection('languages', [...form.languages, blankLanguage()])}>
                Add Language
              </Button>
            </div>
          )}

          {currentStep === 7 && (
            <Input
              label="Additional Information (max 1000 chars)"
              value={form.additionalInfo}
              maxLength={1000}
              onChange={(e) => updateSection('additionalInfo', e.target.value)}
            />
          )}

          {currentStep === 8 && (
            <div className="space-y-4">
              <Card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>
                  {!isApprovedProfileView && <Button variant="secondary" onClick={() => setCurrentStep(1)}>Edit</Button>}
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-lg bg-white p-3"><p className="text-slate-500">First Name</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.firstName)}</p></div>
                  <div className="rounded-lg bg-white p-3"><p className="text-slate-500">Middle Name</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.middleName)}</p></div>
                  <div className="rounded-lg bg-white p-3"><p className="text-slate-500">Last Name</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.lastName)}</p></div>
                  <div className="rounded-lg bg-white p-3"><p className="text-slate-500">Date of Birth</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.dateOfBirth)}</p></div>
                  <div className="rounded-lg bg-white p-3"><p className="text-slate-500">Country of Birth</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.countryOfBirth)}</p></div>
                  <div className="rounded-lg bg-white p-3"><p className="text-slate-500">Citizenship</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.citizenship)}</p></div>
                  <div className="rounded-lg bg-white p-3"><p className="text-slate-500">Current Country of Residence</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.currentCountryOfResidence)}</p></div>
                  {requireVisa && (
                    <div className="rounded-lg bg-white p-3"><p className="text-slate-500">Current Visa Status</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.currentVisaStatus)}</p></div>
                  )}
                  <div className="rounded-lg bg-white p-3 md:col-span-2"><p className="text-slate-500">Email</p><p className="font-medium text-slate-900">{reviewValue(form.personalDetails.email)}</p></div>
                </div>
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Education</h3>
                  {!isApprovedProfileView && <Button variant="secondary" onClick={() => setCurrentStep(2)}>Edit</Button>}
                </div>

                <div className="space-y-4 text-sm">
                  <div className="rounded-lg bg-white p-4">
                    <p className="mb-2 font-semibold text-slate-900">High School / 12th</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div><p className="text-slate-500">Start</p><p className="font-medium text-slate-900">{reviewValue(form.education.highSchool.startDate)}</p></div>
                      <div><p className="text-slate-500">End</p><p className="font-medium text-slate-900">{reviewValue(form.education.highSchool.endDate)}</p></div>
                      <div><p className="text-slate-500">Academic Track</p><p className="font-medium text-slate-900">{reviewValue(form.education.highSchool.track)}</p></div>
                      <div><p className="text-slate-500">Country</p><p className="font-medium text-slate-900">{reviewValue(form.education.highSchool.country)}</p></div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-4">
                    <p className="mb-2 font-semibold text-slate-900">Diploma</p>
                    {form.education.diploma.notApplicable ? (
                      <p className="text-slate-600">Not applicable</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><p className="text-slate-500">Duration</p><p className="font-medium text-slate-900">{reviewValue(form.education.diploma.duration)}</p></div>
                        <div><p className="text-slate-500">Includes 1-year training</p><p className="font-medium text-slate-900">{reviewValue(form.education.diploma.hasTraining)}</p></div>
                        <div><p className="text-slate-500">Start</p><p className="font-medium text-slate-900">{reviewValue(form.education.diploma.startDate)}</p></div>
                        <div><p className="text-slate-500">End</p><p className="font-medium text-slate-900">{reviewValue(form.education.diploma.endDate)}</p></div>
                        <div><p className="text-slate-500">Field</p><p className="font-medium text-slate-900">{reviewValue(form.education.diploma.field)}</p></div>
                        <div><p className="text-slate-500">Country</p><p className="font-medium text-slate-900">{reviewValue(form.education.diploma.country)}</p></div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-white p-4">
                    <p className="mb-2 font-semibold text-slate-900">Bachelor's</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div><p className="text-slate-500">Start</p><p className="font-medium text-slate-900">{reviewValue(form.education.bachelors.startDate)}</p></div>
                      <div><p className="text-slate-500">End</p><p className="font-medium text-slate-900">{reviewValue(form.education.bachelors.endDate)}</p></div>
                      <div><p className="text-slate-500">Field</p><p className="font-medium text-slate-900">{reviewValue(form.education.bachelors.field)}</p></div>
                      <div><p className="text-slate-500">Country</p><p className="font-medium text-slate-900">{reviewValue(form.education.bachelors.country)}</p></div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-4">
                    <p className="mb-2 font-semibold text-slate-900">Master's</p>
                    {form.education.masters.notApplicable ? (
                      <p className="text-slate-600">Not applicable</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><p className="text-slate-500">Start</p><p className="font-medium text-slate-900">{reviewValue(form.education.masters.startDate)}</p></div>
                        <div><p className="text-slate-500">End</p><p className="font-medium text-slate-900">{reviewValue(form.education.masters.endDate)}</p></div>
                        <div><p className="text-slate-500">Field</p><p className="font-medium text-slate-900">{reviewValue(form.education.masters.field)}</p></div>
                        <div><p className="text-slate-500">Country</p><p className="font-medium text-slate-900">{reviewValue(form.education.masters.country)}</p></div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-white p-4">
                    <p className="mb-2 font-semibold text-slate-900">Additional Qualifications</p>
                    {form.education.additionalQualifications.some((q) => q.qualificationName || q.field || q.startDate || q.endDate || q.country) ? (
                      <div className="space-y-3">
                        {form.education.additionalQualifications
                          .filter((q) => q.qualificationName || q.field || q.startDate || q.endDate || q.country)
                          .map((q, idx) => (
                            <div key={idx} className="rounded-lg border border-slate-200 p-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Qualification {idx + 1}</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div><p className="text-slate-500">Qualification Name</p><p className="font-medium text-slate-900">{reviewValue(q.qualificationName)}</p></div>
                                <div><p className="text-slate-500">Field</p><p className="font-medium text-slate-900">{reviewValue(q.field)}</p></div>
                                <div><p className="text-slate-500">Start</p><p className="font-medium text-slate-900">{reviewValue(q.startDate)}</p></div>
                                <div><p className="text-slate-500">End</p><p className="font-medium text-slate-900">{reviewValue(q.endDate)}</p></div>
                                <div><p className="text-slate-500">Country</p><p className="font-medium text-slate-900">{reviewValue(q.country)}</p></div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-slate-600">Not provided</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Certifications</h3>
                  {!isApprovedProfileView && <Button variant="secondary" onClick={() => setCurrentStep(3)}>Edit</Button>}
                </div>
                {form.certifications.some((c) => c.certificationName || c.issuingOrganization || c.yearCompleted) ? (
                  <div className="space-y-3 text-sm">
                    {form.certifications
                      .filter((c) => c.certificationName || c.issuingOrganization || c.yearCompleted)
                      .map((c, idx) => (
                        <div key={idx} className="rounded-lg bg-white p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Certification {idx + 1}</p>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div><p className="text-slate-500">Name</p><p className="font-medium text-slate-900">{reviewValue(c.certificationName)}</p></div>
                            <div><p className="text-slate-500">Issuing Organization / Platform</p><p className="font-medium text-slate-900">{reviewValue(c.issuingOrganization)}</p></div>
                            <div><p className="text-slate-500">Year Completed</p><p className="font-medium text-slate-900">{reviewValue(c.yearCompleted)}</p></div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Not provided</p>
                )}
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Work Experience / Internships</h3>
                  {!isApprovedProfileView && <Button variant="secondary" onClick={() => setCurrentStep(4)}>Edit</Button>}
                </div>
                {form.workExperience.some((w) => w.organizationName || w.jobTitle || w.responsibilities || w.startDate || w.endDate || w.currentlyWorkingHere || w.country) ? (
                  <div className="space-y-3 text-sm">
                    {form.workExperience
                      .filter((w) => w.organizationName || w.jobTitle || w.responsibilities || w.startDate || w.endDate || w.currentlyWorkingHere || w.country)
                      .map((w, idx) => (
                        <div key={idx} className="rounded-lg bg-white p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Experience {idx + 1}</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div><p className="text-slate-500">Organization</p><p className="font-medium text-slate-900">{reviewValue(w.organizationName)}</p></div>
                            <div><p className="text-slate-500">Job Title</p><p className="font-medium text-slate-900">{reviewValue(w.jobTitle)}</p></div>
                            <div><p className="text-slate-500">Country</p><p className="font-medium text-slate-900">{reviewValue(w.country)}</p></div>
                            <div><p className="text-slate-500">Currently Working Here</p><p className="font-medium text-slate-900">{w.currentlyWorkingHere ? 'Yes' : 'No'}</p></div>
                            <div><p className="text-slate-500">Start Date</p><p className="font-medium text-slate-900">{reviewValue(w.startDate)}</p></div>
                            <div><p className="text-slate-500">End Date</p><p className="font-medium text-slate-900">{w.currentlyWorkingHere ? 'Present' : reviewValue(w.endDate)}</p></div>
                            <div className="md:col-span-2"><p className="text-slate-500">Key Responsibilities</p><p className="font-medium text-slate-900">{reviewValue(w.responsibilities)}</p></div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Not provided</p>
                )}
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Skills</h3>
                  {!isApprovedProfileView && <Button variant="secondary" onClick={() => setCurrentStep(5)}>Edit</Button>}
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-slate-500">Technical Skills</p>
                    <p className="font-medium text-slate-900">{technicalSkills.length ? technicalSkills.join(', ') : 'Not provided'}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-slate-500">Soft Skills</p>
                    <p className="font-medium text-slate-900">{reviewValue(form.skills.soft)}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Languages</h3>
                  {!isApprovedProfileView && <Button variant="secondary" onClick={() => setCurrentStep(6)}>Edit</Button>}
                </div>
                {form.languages.some((lang) => lang.language || lang.proficiencyLevel || lang.certified === 'Yes' || lang.certificateTitle) ? (
                  <div className="space-y-3 text-sm">
                    {form.languages
                      .filter((lang) => lang.language || lang.proficiencyLevel || lang.certified === 'Yes' || lang.certificateTitle)
                      .map((lang, idx) => (
                        <div key={idx} className="rounded-lg bg-white p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Language {idx + 1}</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div><p className="text-slate-500">Language</p><p className="font-medium text-slate-900">{reviewValue(lang.language)}</p></div>
                            <div><p className="text-slate-500">Proficiency Level</p><p className="font-medium text-slate-900">{reviewValue(lang.proficiencyLevel)}</p></div>
                            <div><p className="text-slate-500">Certified</p><p className="font-medium text-slate-900">{reviewValue(lang.certified)}</p></div>
                            {lang.certified === 'Yes' && (
                              <div><p className="text-slate-500">Certificate Title</p><p className="font-medium text-slate-900">{reviewValue(lang.certificateTitle)}</p></div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Not provided</p>
                )}
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Additional Information</h3>
                  {!isApprovedProfileView && <Button variant="secondary" onClick={() => setCurrentStep(7)}>Edit</Button>}
                </div>
                <div className="rounded-lg bg-white p-4 text-sm">
                  <p className="text-slate-500">Notes</p>
                  <p className="whitespace-pre-wrap font-medium text-slate-900">{reviewValue(form.additionalInfo)}</p>
                </div>
              </Card>

              {!isApprovedProfileView && (
                <Button onClick={() => setShowAckModal(true)} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Profile for Evaluation'}
                </Button>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            {currentStep > 1 && currentStep < 8 && (
              <Button variant="secondary" onClick={() => setCurrentStep((s) => s - 1)}>Back</Button>
            )}
            {currentStep < 8 && (
              <Button onClick={handleNext}>Next</Button>
            )}
          </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Modal isOpen={showFinancialModal} title="Program Fee Structure" onClose={() => {}} hideClose>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-semibold text-slate-900">Initial Evaluation Fee</p>
            <p className="text-slate-700">USD 500 non-refundable</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-semibold text-slate-900">Program Fee</p>
            <p className="text-slate-700">USD 8,000</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-semibold text-slate-900">Documentation Verification Fee</p>
            <p className="text-slate-700">USD 500</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Post Initial Evaluation</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>USD 500 non-refundable</li>
            <li>USD 3,500 includes verification fee, payable before document submission, refundable only if not selected post interview stage</li>
            <li>USD 4,000 payable upon successful selection</li>
          </ul>
          <p className="mt-3 rounded-md bg-amber-50 p-2 text-amber-900">
            Fees apply to program participation and support services and are not linked to job guarantees.
          </p>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={financialAccepted} onChange={(e) => setFinancialAccepted(e.target.checked)} />
          I have read, reviewed, and understood the fee structure below before moving forward.
        </label>
        <Button className="mt-4" disabled={!financialAccepted} onClick={() => setShowFinancialModal(false)}>Sign & Continue</Button>
      </Modal>

      <SignatureModal
        isOpen={showAckModal}
        onClose={() => setShowAckModal(false)}
        title="Digital Acknowledgement"
        description={acknowledgementText}
        metaFields={{
          fullName: fullName || 'Not available',
          dateTime: signedDateTime,
          location: 'Auto-captured placeholder',
        }}
        onConfirm={(sig) => {
          setSignature(sig);
          submitProfile();
        }}
      />
      <div className="relative z-30">
        <Footer />
      </div>
    </div>
  );
}
