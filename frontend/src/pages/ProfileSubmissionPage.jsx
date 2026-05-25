import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import CountrySearchSelect from '../components/CountrySearchSelect';
import Modal from '../components/Modal';
import SignatureModal from '../components/SignatureModal';
import CandidatePortalSidebar from '../components/CandidatePortalSidebar';
import api from '../api/axios';
import { countries } from 'countries-list';

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
const getCurrentMonthYearValue = () => {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
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
const formatEndMonthYearInput = (value) => {
  const formatted = formatMonthYearInput(value);
  if (!monthYearRegex.test(formatted)) return formatted;
  return isEndAfterCurrentMonth(formatted) ? getCurrentMonthYearValue() : formatted;
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
const blankWork = (experienceType = 'work') => ({ experienceType, organizationName: '', jobTitle: '', responsibilities: '', startDate: '', endDate: '', currentlyWorkingHere: false, country: '' });
const blankLanguage = () => ({ language: '', proficiencyLevel: '' });
const getLanguageOptionsByEligibilityCountry = (countryName) => {
  const normalized = String(countryName || '').trim().toLowerCase();
  if (normalized === 'germany') return ['German'];
  if (normalized === 'switzerland') return ['German', 'French', 'Italian'];
  if (normalized === 'austria') return ['German'];
  if (normalized === 'poland') return ['German', 'English'];
  return [];
};
const ensureExperienceRows = (items = []) => {
  const normalized = (Array.isArray(items) ? items : []).map((w) => ({
    ...blankWork(w?.experienceType || 'work'),
    ...(w || {}),
  }));
  const workRows = normalized.filter((item) => item.experienceType !== 'internship');
  const internshipRows = normalized.filter((item) => item.experienceType === 'internship');
  if (!workRows.length) workRows.push(blankWork('work'));
  if (!internshipRows.length) internshipRows.push(blankWork('internship'));
  return [...workRows, ...internshipRows];
};
const hasValue = (value) => {
  if (typeof value === 'string') return Boolean(value.trim());
  return Boolean(value);
};
const addError = (errors, path, message) => {
  if (!errors[path]) {
    errors[path] = message;
  }
};
const areErrorMapsEqual = (left, right) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
};
const getStepValidation = (step, form, { requireVisa, technicalSkills, financialAccepted, providedSignature } = {}) => {
  const errors = {};
  let summary = null;

  if (step === 1) {
    const p = form.personalDetails;
    const missingRequired = [];

    if (!hasValue(p.firstName)) {
      addError(errors, 'personalDetails.firstName', 'First name is required.');
      missingRequired.push('firstName');
    }
    if (!hasValue(p.lastName)) {
      addError(errors, 'personalDetails.lastName', 'Last name is required.');
      missingRequired.push('lastName');
    }
    if (!hasValue(p.dateOfBirth)) {
      addError(errors, 'personalDetails.dateOfBirth', 'Date of birth is required.');
      missingRequired.push('dateOfBirth');
    }
    if (!hasValue(p.countryOfBirth)) {
      addError(errors, 'personalDetails.countryOfBirth', 'Country of birth is required.');
      missingRequired.push('countryOfBirth');
    }
    if (!hasValue(p.citizenship)) {
      addError(errors, 'personalDetails.citizenship', 'Citizenship is required.');
      missingRequired.push('citizenship');
    }
    if (!hasValue(p.currentCountryOfResidence)) {
      addError(errors, 'personalDetails.currentCountryOfResidence', 'Current country of residence is required.');
      missingRequired.push('currentCountryOfResidence');
    }
    if (missingRequired.length && !summary) {
      summary = 'Please complete all mandatory personal details before continuing.';
    }
    if (requireVisa && !hasValue(p.currentVisaStatus)) {
      addError(errors, 'personalDetails.currentVisaStatus', 'Current visa status is required when country of birth and current country of residence differ.');
      summary ||= 'Current visa status is required when country of birth and current country of residence differ.';
    }
  }

  if (step === 2) {
    const e = form.education;
    const highSchoolMissing = [];

    if (!hasValue(e.highSchool.startDate)) {
      addError(errors, 'education.highSchool.startDate', 'High school start date is required.');
      highSchoolMissing.push('startDate');
    }
    if (!hasValue(e.highSchool.endDate)) {
      addError(errors, 'education.highSchool.endDate', 'High school end date is required.');
      highSchoolMissing.push('endDate');
    }
    if (!hasValue(e.highSchool.track)) {
      addError(errors, 'education.highSchool.track', 'Academic track is required.');
      highSchoolMissing.push('track');
    }
    if (!hasValue(e.highSchool.country)) {
      addError(errors, 'education.highSchool.country', 'High school country is required.');
      highSchoolMissing.push('country');
    }
    if (highSchoolMissing.length && !summary) {
      summary = 'Please complete all mandatory high school fields.';
    }

    const dateFields = [
      ['education.highSchool.startDate', 'High school start date', e.highSchool.startDate],
      ['education.highSchool.endDate', 'High school end date', e.highSchool.endDate],
      ['education.diploma.startDate', 'Diploma start date', e.diploma.startDate],
      ['education.diploma.endDate', 'Diploma end date', e.diploma.endDate],
      ['education.bachelors.startDate', "Bachelor's start date", e.bachelors.startDate],
      ['education.bachelors.endDate', "Bachelor's end date", e.bachelors.endDate],
      ['education.masters.startDate', "Master's start date", e.masters.startDate],
      ['education.masters.endDate', "Master's end date", e.masters.endDate],
    ];

    dateFields.forEach(([path, label, value]) => {
      if (hasValue(value) && !monthYearRegex.test(value)) {
        addError(errors, path, `${label} must use MM/YYYY format.`);
        summary ||= 'Use MM/YYYY format for education dates.';
      }
    });

    if (!e.diploma.notApplicable) {
      const diplomaMissing = [];
      if (!hasValue(e.diploma.duration)) {
        addError(errors, 'education.diploma.duration', 'Diploma duration is required.');
        diplomaMissing.push('duration');
      }
      if (!hasValue(e.diploma.hasTraining)) {
        addError(errors, 'education.diploma.hasTraining', 'Please specify whether the diploma includes training.');
        diplomaMissing.push('hasTraining');
      }
      if (!hasValue(e.diploma.startDate)) {
        addError(errors, 'education.diploma.startDate', 'Diploma start date is required.');
        diplomaMissing.push('startDate');
      }
      if (!hasValue(e.diploma.endDate)) {
        addError(errors, 'education.diploma.endDate', 'Diploma end date is required.');
        diplomaMissing.push('endDate');
      }
      if (!hasValue(e.diploma.field)) {
        addError(errors, 'education.diploma.field', 'Diploma field of study is required.');
        diplomaMissing.push('field');
      }
      if (!hasValue(e.diploma.country)) {
        addError(errors, 'education.diploma.country', 'Diploma country is required.');
        diplomaMissing.push('country');
      }
      if (diplomaMissing.length && !summary) {
        summary = 'Please complete all diploma fields or mark diploma as not applicable.';
      }
    } else {
      const bachelorsMissing = [];
      if (!hasValue(e.bachelors.startDate)) {
        addError(errors, 'education.bachelors.startDate', "Bachelor's start date is required.");
        bachelorsMissing.push('startDate');
      }
      if (!hasValue(e.bachelors.endDate)) {
        addError(errors, 'education.bachelors.endDate', "Bachelor's end date is required.");
        bachelorsMissing.push('endDate');
      }
      if (!hasValue(e.bachelors.field)) {
        addError(errors, 'education.bachelors.field', "Bachelor's field of study is required.");
        bachelorsMissing.push('field');
      }
      if (!hasValue(e.bachelors.country)) {
        addError(errors, 'education.bachelors.country', "Bachelor's country is required.");
        bachelorsMissing.push('country');
      }
      if (bachelorsMissing.length && !summary) {
        summary = "Bachelor's details are mandatory when diploma is not applicable.";
      }
    }

    const bachelorsTouched = [e.bachelors.startDate, e.bachelors.endDate, e.bachelors.field, e.bachelors.country].some(hasValue);
    if (!e.diploma.notApplicable && bachelorsTouched) {
      if (!hasValue(e.bachelors.startDate)) addError(errors, 'education.bachelors.startDate', "Bachelor's start date is required once you start this section.");
      if (!hasValue(e.bachelors.endDate)) addError(errors, 'education.bachelors.endDate', "Bachelor's end date is required once you start this section.");
      if (!hasValue(e.bachelors.field)) addError(errors, 'education.bachelors.field', "Bachelor's field of study is required once you start this section.");
      if (!hasValue(e.bachelors.country)) addError(errors, 'education.bachelors.country', "Bachelor's country is required once you start this section.");
      if (Object.keys(errors).some((key) => key.startsWith('education.bachelors.')) && !summary) {
        summary = "Please complete all highlighted bachelor's fields before continuing.";
      }
    }

    if (!e.masters.notApplicable) {
      const mastersTouched = [e.masters.startDate, e.masters.endDate, e.masters.field, e.masters.country].some(hasValue);
      if (!hasValue(e.masters.startDate)) addError(errors, 'education.masters.startDate', "Master's start date is required.");
      if (!hasValue(e.masters.endDate)) addError(errors, 'education.masters.endDate', "Master's end date is required.");
      if (!hasValue(e.masters.field)) addError(errors, 'education.masters.field', "Master's field of study is required.");
      if (!hasValue(e.masters.country)) addError(errors, 'education.masters.country', "Master's country is required.");
      if (mastersTouched && !summary) {
        summary = "Please complete all highlighted master's fields before continuing.";
      }
    }

    e.additionalQualifications.forEach((q, idx) => {
      const touched = [q.qualificationName, q.field, q.startDate, q.endDate].some(hasValue);
      if (!touched) return;

      if (!hasValue(q.qualificationName)) addError(errors, `education.additionalQualifications.${idx}.qualificationName`, `Qualification name is required for additional qualification ${idx + 1}.`);
      if (!hasValue(q.field)) addError(errors, `education.additionalQualifications.${idx}.field`, `Field is required for additional qualification ${idx + 1}.`);
      if (!hasValue(q.startDate)) addError(errors, `education.additionalQualifications.${idx}.startDate`, `Start date is required for additional qualification ${idx + 1}.`);
      if (!hasValue(q.endDate)) addError(errors, `education.additionalQualifications.${idx}.endDate`, `End date is required for additional qualification ${idx + 1}.`);
      if (hasValue(q.startDate) && !monthYearRegex.test(q.startDate)) {
        addError(errors, `education.additionalQualifications.${idx}.startDate`, `Additional qualification ${idx + 1} start date must use MM/YYYY format.`);
        summary ||= 'Use MM/YYYY format for education dates.';
      }
      if (hasValue(q.endDate) && !monthYearRegex.test(q.endDate)) {
        addError(errors, `education.additionalQualifications.${idx}.endDate`, `Additional qualification ${idx + 1} end date must use MM/YYYY format.`);
        summary ||= 'Use MM/YYYY format for education dates.';
      }
      if (
        Object.keys(errors).some((key) => key.startsWith(`education.additionalQualifications.${idx}.`)) &&
        !summary
      ) {
        summary = 'Please complete all highlighted additional qualification fields before continuing.';
      }
    });

    const educationPairs = [
      { label: 'High school', startPath: 'education.highSchool.startDate', endPath: 'education.highSchool.endDate', startDate: e.highSchool.startDate, endDate: e.highSchool.endDate },
      { label: 'Diploma', startPath: 'education.diploma.startDate', endPath: 'education.diploma.endDate', startDate: e.diploma.startDate, endDate: e.diploma.endDate },
      { label: "Bachelor's", startPath: 'education.bachelors.startDate', endPath: 'education.bachelors.endDate', startDate: e.bachelors.startDate, endDate: e.bachelors.endDate },
      { label: "Master's", startPath: 'education.masters.startDate', endPath: 'education.masters.endDate', startDate: e.masters.startDate, endDate: e.masters.endDate },
      ...e.additionalQualifications.map((item, idx) => ({
        label: `Additional qualification ${idx + 1}`,
        startPath: `education.additionalQualifications.${idx}.startDate`,
        endPath: `education.additionalQualifications.${idx}.endDate`,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
    ];

    educationPairs.forEach((pair) => {
      if (monthYearRegex.test(pair.startDate) && monthYearRegex.test(pair.endDate) && isEndBeforeStart(pair.startDate, pair.endDate)) {
        addError(errors, pair.endPath, `${pair.label} end date must be after start date.`);
        summary ||= `${pair.label} end date must be after start date.`;
      }
      if (monthYearRegex.test(pair.endDate) && isEndAfterCurrentMonth(pair.endDate)) {
        addError(errors, pair.endPath, `${pair.label} end date cannot be in the future.`);
        summary ||= `${pair.label} end date cannot be in the future.`;
      }
    });

    if (e.additionalQualifications.length > 3) {
      summary ||= 'Additional qualifications max is 3.';
    }
  }

  if (step === 3) {
    if (form.certifications.length > 10) {
      summary = 'Certifications max is 10.';
    }

    form.certifications.forEach((cert, idx) => {
      const touched = [cert.certificationName, cert.issuingOrganization, cert.yearCompleted].some(hasValue);
      if (!touched) return;

      if (!hasValue(cert.certificationName)) addError(errors, `certifications.${idx}.certificationName`, `Certification name is required for entry ${idx + 1}.`);
      if (!hasValue(cert.issuingOrganization)) addError(errors, `certifications.${idx}.issuingOrganization`, `Issuing organization is required for entry ${idx + 1}.`);
      if (!hasValue(cert.yearCompleted)) addError(errors, `certifications.${idx}.yearCompleted`, `Year completed is required for entry ${idx + 1}.`);
      if (hasValue(cert.yearCompleted) && !/^\d{4}$/.test(cert.yearCompleted)) {
        addError(errors, `certifications.${idx}.yearCompleted`, `Certification year for entry ${idx + 1} must be in YYYY format.`);
        summary ||= 'Certification year must be in YYYY format.';
      }
    });

    if (Object.keys(errors).length && !summary) {
      summary = 'Please complete all fields for each certification entry.';
    }
  }

  if (step === 4) {
    const workCount = form.workExperience.filter((item) => item.experienceType !== 'internship').length;
    const internshipCount = form.workExperience.filter((item) => item.experienceType === 'internship').length;
    if (workCount > 10) summary = 'Work experience max is 10.';
    if (internshipCount > 10) summary ||= 'Internship max is 10.';

    form.workExperience.forEach((work, idx) => {
      const touched = [work.organizationName, work.jobTitle, work.responsibilities, work.startDate, work.endDate, work.country].some(hasValue) || work.currentlyWorkingHere;
      if (!touched) return;

      if (!hasValue(work.organizationName)) addError(errors, `workExperience.${idx}.organizationName`, `Organization name is required for work experience ${idx + 1}.`);
      if (!hasValue(work.jobTitle)) addError(errors, `workExperience.${idx}.jobTitle`, `Job title is required for work experience ${idx + 1}.`);
      if (!hasValue(work.responsibilities)) addError(errors, `workExperience.${idx}.responsibilities`, `Key responsibilities are required for work experience ${idx + 1}.`);
      if (!hasValue(work.country)) addError(errors, `workExperience.${idx}.country`, `Country is required for work experience ${idx + 1}.`);
      if (!hasValue(work.startDate)) addError(errors, `workExperience.${idx}.startDate`, `Start date is required for work experience ${idx + 1}.`);
      if (!work.currentlyWorkingHere && !hasValue(work.endDate)) addError(errors, `workExperience.${idx}.endDate`, `End date is required unless you are currently working here for work experience ${idx + 1}.`);

      if (hasValue(work.startDate) && !monthYearRegex.test(work.startDate)) {
        addError(errors, `workExperience.${idx}.startDate`, `Work experience ${idx + 1} start date must use MM/YYYY format.`);
        summary ||= 'Use MM/YYYY format for work dates.';
      }
      if (!work.currentlyWorkingHere && hasValue(work.endDate) && !monthYearRegex.test(work.endDate)) {
        addError(errors, `workExperience.${idx}.endDate`, `Work experience ${idx + 1} end date must use MM/YYYY format.`);
        summary ||= 'Use MM/YYYY format for work dates.';
      }
      if (
        monthYearRegex.test(work.startDate) &&
        monthYearRegex.test(work.endDate) &&
        !work.currentlyWorkingHere &&
        isEndBeforeStart(work.startDate, work.endDate)
      ) {
        addError(errors, `workExperience.${idx}.endDate`, `Work experience ${idx + 1} end date must be after start date.`);
        summary ||= `Work experience ${idx + 1} end date must be after start date.`;
      }
      if (!work.currentlyWorkingHere && monthYearRegex.test(work.endDate) && isEndAfterCurrentMonth(work.endDate)) {
        addError(errors, `workExperience.${idx}.endDate`, `Work experience ${idx + 1} end date cannot be in the future.`);
        summary ||= `Work experience ${idx + 1} end date cannot be in the future.`;
      }
    });

    if (Object.keys(errors).length && !summary) {
      summary = 'Please complete all highlighted work experience fields before continuing.';
    }
  }

  if (step === 5) {
    if (!technicalSkills.length) {
      addError(errors, 'skills.technical', 'At least one technical skill is required.');
      summary = 'Technical skills are mandatory.';
    }
  }

  if (step === 6) {
    form.languages.forEach((lang, idx) => {
      const touched = idx === 0 || hasValue(lang.language) || hasValue(lang.proficiencyLevel);
      if (!touched) return;

      if (!hasValue(lang.language)) addError(errors, `languages.${idx}.language`, `Language is required for entry ${idx + 1}.`);
      if (!hasValue(lang.proficiencyLevel)) addError(errors, `languages.${idx}.proficiencyLevel`, `Proficiency level is required for entry ${idx + 1}.`);
    });

    if (errors['languages.0.language'] || errors['languages.0.proficiencyLevel']) {
      summary = 'Please complete at least one language proficiency entry.';
    } else if (Object.keys(errors).length && !summary) {
      summary = 'Please complete all highlighted language fields before continuing.';
    }
  }

  if (step === 8) {
    if (!financialAccepted) {
      summary = 'Financial disclosure acceptance is required.';
    }
    if (!providedSignature?.value) {
      summary ||= 'Acknowledgement signature is required.';
    }
  }

  return { summary, fieldErrors: errors };
};
const clampStep = (value, fallback = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(8, Math.max(1, Math.trunc(numeric)));
};
const countryOptions = Object.values(countries)
  .map((country) => country.name)
  .sort((left, right) => left.localeCompare(right));
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
  },
  education: {
    highSchool: { startDate: '', endDate: '', track: '', country: '' },
    diploma: { notApplicable: false, duration: '', hasTraining: '', startDate: '', endDate: '', field: '', country: '' },
    bachelors: { startDate: '', endDate: '', field: '', country: '' },
    masters: { notApplicable: true, startDate: '', endDate: '', field: '', country: '' },
    additionalQualifications: [blankQualification()],
  },
  certifications: [blankCertification()],
  workExperience: [blankWork('work'), blankWork('internship')],
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
    workExperience: ensureExperienceRows(normalizeArray(profile?.workExperience, () => blankWork('work'))),
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [listLimitMessages, setListLimitMessages] = useState({});
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [financialAccepted, setFinancialAccepted] = useState(false);
  const [showAckModal, setShowAckModal] = useState(false);
  const [signature, setSignature] = useState(null);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [isApprovedProfileView, setIsApprovedProfileView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [technicalSkillInput, setTechnicalSkillInput] = useState('');
  const [eligibilityDetails, setEligibilityDetails] = useState(null);
  const navigate = useNavigate();

  const [form, setForm] = useState(createDefaultForm);
  const getFieldError = (path) => fieldErrors[path];
  const goToStep = (step) => {
    setFieldErrors({});
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  useEffect(() => {
    let isMounted = true;

    const loadExistingProfile = async () => {
      try {
        const { data: dashboardData } = await api.get('/dashboard/me');
        if (isMounted) {
          setEligibilityDetails(dashboardData?.eligibility || null);
        }

        const { data: existingProfile } = await api.get('/profile/me');
        if (!isMounted) return;

        if (existingProfile) {
          setHasExistingProfile(true);
          setIsApprovedProfileView(existingProfile.status === 'accepted');
          setForm(hydrateFormFromProfile(existingProfile));
          setFinancialAccepted(Boolean(existingProfile.financialDisclosureAccepted));
          setSignature(existingProfile.signature || null);
          if (existingProfile.status === 'draft') {
            setCurrentStep(clampStep(existingProfile.savedStep, 1));
            setShowFinancialModal(Boolean(!existingProfile.financialDisclosureAccepted));
          } else {
            setCurrentStep(8);
            setShowFinancialModal(false);
          }
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
    form.personalDetails.countryOfBirth &&
    form.personalDetails.currentCountryOfResidence !== form.personalDetails.countryOfBirth;

  useEffect(() => {
    if (!requireVisa && form.personalDetails.currentVisaStatus) {
      updateSection('personalDetails', {
        ...form.personalDetails,
        currentVisaStatus: '',
      });
    }
  }, [form.personalDetails, requireVisa]);

  const fullName = `${form.personalDetails.firstName} ${form.personalDetails.lastName}`.trim();
  const signedDateTime = new Date().toLocaleString();
  const allowedLanguageOptions = useMemo(
    () => getLanguageOptionsByEligibilityCountry(eligibilityDetails?.country),
    [eligibilityDetails?.country],
  );
  const languageOptions = allowedLanguageOptions.length ? allowedLanguageOptions : ['German', 'English', 'French', 'Italian'];
  const canAddLanguage = allowedLanguageOptions.length >= 2 && form.languages.length < languageOptions.length;
  const acknowledgementText = `By proceeding with this submission, you confirm that all information provided by you is true, accurate, and complete to the best of your knowledge.

You understand that this information will be used for evaluation, verification, and alignment with international opportunities as part of the NextStep Talent process.

You acknowledge that any incorrect, misleading, or incomplete information may impact your eligibility or progression within the program.

By signing below, you accept full responsibility for the authenticity of the details submitted.`;

  useEffect(() => {
    if (!allowedLanguageOptions.length) return;
    setForm((prev) => {
      const sanitized = (prev.languages || []).map((entry) => {
        if (!entry?.language) return entry;
        return allowedLanguageOptions.includes(entry.language)
          ? entry
          : { ...entry, language: '', proficiencyLevel: '' };
      });
      const withAtLeastOne = sanitized.length ? sanitized : [blankLanguage()];
      if (!withAtLeastOne[0].language && allowedLanguageOptions.length === 1) {
        withAtLeastOne[0] = { ...withAtLeastOne[0], language: allowedLanguageOptions[0] };
      }
      return { ...prev, languages: withAtLeastOne };
    });
  }, [allowedLanguageOptions]);

  const technicalSkills = useMemo(
    () => form.skills.technical.split(',').map((skill) => skill.trim()).filter(Boolean),
    [form.skills.technical],
  );
  useEffect(() => {
    if (!Object.keys(fieldErrors).length) return;
    const nextErrors = getStepValidation(currentStep, form, {
      requireVisa,
      technicalSkills,
      financialAccepted,
      providedSignature: signature,
    }).fieldErrors;
    setFieldErrors((prev) => (areErrorMapsEqual(prev, nextErrors) ? prev : nextErrors));
  }, [currentStep, fieldErrors, financialAccepted, form, requireVisa, signature, technicalSkills]);

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

  const getCurrentStepValidation = () =>
    getStepValidation(currentStep, form, {
      requireVisa,
      technicalSkills,
      financialAccepted,
      providedSignature: signature,
    });

  const saveDraft = async ({ nextStep = currentStep, successMessage = 'Draft saved.', showSuccessMessage = true } = {}) => {
    setSavingDraft(true);
    try {
      const payload = {
        ...form,
        financialDisclosureAccepted: financialAccepted,
        acknowledgementSigned: Boolean(signature?.value),
        signature: signature || null,
        savedStep: clampStep(nextStep, currentStep),
        status: 'draft',
      };

      const request = hasExistingProfile ? api.put('/profile/me', payload) : api.post('/profile', payload);
      await request;
      setHasExistingProfile(true);
      setFieldErrors({});
      setCurrentStep(clampStep(nextStep, currentStep));
      if (showSuccessMessage && successMessage) {
        alert(successMessage);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const validation = getCurrentStepValidation();
    setFieldErrors(validation.fieldErrors);
    if (validation.summary) return alert(validation.summary);
    const nextStep = clampStep(currentStep + 1, 8);
    await saveDraft({
      nextStep,
      showSuccessMessage: false,
    });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const getSubmissionValidation = (providedSignature = signature) => {
    if (!financialAccepted) {
      return { step: currentStep, summary: 'Financial disclosure acceptance is required.', fieldErrors: {} };
    }

    for (let step = 1; step <= 6; step += 1) {
      const validation = getStepValidation(step, form, {
        requireVisa,
        technicalSkills,
        financialAccepted,
        providedSignature,
      });
      if (validation.summary || Object.keys(validation.fieldErrors).length) {
        return { step, ...validation };
      }
    }

    if (!providedSignature?.value) {
      return { step: 8, summary: 'Acknowledgement signature is required.', fieldErrors: {} };
    }

    return null;
  };

  const submitProfile = async (providedSignature = signature) => {
    const validation = getSubmissionValidation(providedSignature);
    if (validation) {
      if (validation.step !== currentStep) {
        goToStep(validation.step);
      }
      setFieldErrors(validation.fieldErrors);
      return alert(validation.summary);
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        financialDisclosureAccepted: financialAccepted,
        acknowledgementSigned: true,
        signature: {
          ...(providedSignature || {}),
          fullName,
          signedAt: new Date().toISOString(),
          location: 'Auto-captured',
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
  const setListLimitMessage = (section, message) =>
    setListLimitMessages((prev) => ({ ...prev, [section]: message }));
  const splitExperience = () => {
    const workRows = form.workExperience.filter((item) => item.experienceType !== 'internship');
    const internshipRows = form.workExperience.filter((item) => item.experienceType === 'internship');
    return { workRows, internshipRows };
  };
  const updateExperienceLists = (workRows, internshipRows) => {
    updateSection('workExperience', [...workRows, ...internshipRows]);
  };
  const reviewValue = (value) => {
    if (value === null || value === undefined) return 'Not provided';
    if (typeof value === 'string' && !value.trim()) return 'Not provided';
    return value;
  };

  return (
    <div className="nst-shell min-h-screen">
      <Navbar />
      <CandidatePortalSidebar />
      <main className="flex-1 px-6 pb-16 pt-28 lg:ml-64">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col gap-6">
            {!isApprovedProfileView && (
              <div className="w-full">
                <div className="nst-card rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Application Progress</h3>
                  <div className="grid gap-2 md:grid-cols-4">
                    {formSteps.map((stepName, idx) => {
                      const stepNo = idx + 1;
                      const active = stepNo === currentStep;
                      const done = stepNo < currentStep;
                      return (
                        <div key={stepName} className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-green-600 text-white' : active ? 'bg-blue-100 text-[#002147]' : 'bg-slate-200 text-slate-600'}`}>
                            {stepNo}
                          </span>
                          <span className={`text-xs ${active ? 'font-semibold text-[#002147]' : 'text-slate-600'}`}>{stepName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="w-full">
              <Card className="nst-card border border-slate-200 rounded-xl p-6">
                <h1 className="text-3xl font-bold text-[#002147]">{isApprovedProfileView ? 'Profile Information' : 'Profile Submission'}</h1>
                <p className="mb-4 mt-2 text-sm text-[#44474e]">
                  {isApprovedProfileView
                    ? 'Your profile has been approved.'
                    : 'Complete all sections carefully. Precision in your profile supports faster evaluation.'}
                </p>

                {isApprovedProfileView && eligibilityDetails && (
                  <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Initial Eligibility Details</h3>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                      <p><b>Destination:</b> {eligibilityDetails.destination || '—'}</p>
                      <p><b>Country:</b> {eligibilityDetails.country || '—'}</p>
                      <p><b>IT Background:</b> {eligibilityDetails.hasITBackground ? 'Yes' : 'No'}</p>
                      <p><b>Qualification:</b> {eligibilityDetails.qualification || '—'}</p>
                      <p><b>Language:</b> {eligibilityDetails.languageAnswer || '—'}</p>
                      <p><b>Current Location:</b> {eligibilityDetails.currentLocation || '—'}</p>
                      <p><b>Willing To Relocate:</b> {eligibilityDetails.willingToRelocate ? 'Yes' : 'No'}</p>
                      <p><b>Comfortable With Fees:</b> {eligibilityDetails.comfortableWithFees ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                )}

          {currentStep === 1 && (
            <div className="grid gap-3 md:grid-cols-2">
              <Input required label="First Name as per passport" error={getFieldError('personalDetails.firstName')} value={form.personalDetails.firstName} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, firstName: e.target.value })} />
              <Input label="Middle Name (optional)" value={form.personalDetails.middleName} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, middleName: e.target.value })} />
              <Input required label="Last Name as per passport" error={getFieldError('personalDetails.lastName')} value={form.personalDetails.lastName} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, lastName: e.target.value })} />
              <Input required label="Date of Birth" error={getFieldError('personalDetails.dateOfBirth')} type="date" value={form.personalDetails.dateOfBirth} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, dateOfBirth: e.target.value })} />
              <CountrySearchSelect required label="Country of Birth" error={getFieldError('personalDetails.countryOfBirth')} options={countryOptions} value={form.personalDetails.countryOfBirth} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, countryOfBirth: e.target.value })} />
              <Input required label="Citizenship" error={getFieldError('personalDetails.citizenship')} value={form.personalDetails.citizenship} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, citizenship: e.target.value })} />
              <CountrySearchSelect required label="Current Country of Residence" error={getFieldError('personalDetails.currentCountryOfResidence')} options={countryOptions} value={form.personalDetails.currentCountryOfResidence} onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, currentCountryOfResidence: e.target.value })} />
                            {requireVisa && (
                <Select
                  required
                  label="Current Visa Status"
                  error={getFieldError('personalDetails.currentVisaStatus')}
                  options={['Applied', 'Approved', 'Rejected']}
                  value={form.personalDetails.currentVisaStatus}
                  onChange={(e) => updateSection('personalDetails', { ...form.personalDetails, currentVisaStatus: e.target.value })}
                />
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <Input required label="High School Start (MM/YYYY)" error={getFieldError('education.highSchool.startDate')} value={form.education.highSchool.startDate} onChange={(e) => updateSection('education', { ...form.education, highSchool: { ...form.education.highSchool, startDate: formatMonthYearInput(e.target.value) } })} placeholder="MM/YYYY" maxLength={7} inputMode="numeric" />
                <Input required label="High School End (MM/YYYY)" error={getFieldError('education.highSchool.endDate')} value={form.education.highSchool.endDate} onChange={(e) => updateSection('education', { ...form.education, highSchool: { ...form.education.highSchool, endDate: formatEndMonthYearInput(e.target.value) } })} placeholder="MM/YYYY" maxLength={7} inputMode="numeric" />
                <Select required label="Academic Track" error={getFieldError('education.highSchool.track')} value={form.education.highSchool.track} onChange={(e) => updateSection('education', { ...form.education, highSchool: { ...form.education.highSchool, track: e.target.value } })} options={['Science', 'Commerce', 'Arts', 'Other']} />
                <CountrySearchSelect required label="High School Country" error={getFieldError('education.highSchool.country')} options={countryOptions} value={form.education.highSchool.country} onChange={(e) => updateSection('education', { ...form.education, highSchool: { ...form.education.highSchool, country: e.target.value } })} />
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
                      error={getFieldError('education.diploma.duration')}
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
                      error={getFieldError('education.diploma.hasTraining')}
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
                      error={getFieldError('education.diploma.startDate')}
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
                      error={getFieldError('education.diploma.endDate')}
                      placeholder="MM/YYYY"
                      maxLength={7}
                      inputMode="numeric"
                      value={form.education.diploma.endDate}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          diploma: { ...form.education.diploma, endDate: formatEndMonthYearInput(e.target.value) },
                        })
                      }
                    />
                    <Input
                      required
                      label="Diploma Field of Study"
                      error={getFieldError('education.diploma.field')}
                      value={form.education.diploma.field}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          diploma: { ...form.education.diploma, field: e.target.value },
                        })
                      }
                    />
                    <CountrySearchSelect
                      required
                      label="Diploma Country"
                      error={getFieldError('education.diploma.country')}
                      options={countryOptions}
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
                    error={getFieldError('education.bachelors.startDate')}
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
                    error={getFieldError('education.bachelors.endDate')}
                    placeholder="MM/YYYY"
                    maxLength={7}
                    inputMode="numeric"
                    value={form.education.bachelors.endDate}
                    onChange={(e) =>
                      updateSection('education', {
                        ...form.education,
                        bachelors: { ...form.education.bachelors, endDate: formatEndMonthYearInput(e.target.value) },
                      })
                    }
                  />
                  <Input
                    required={form.education.diploma.notApplicable}
                    label="Bachelor's Field of Study"
                    error={getFieldError('education.bachelors.field')}
                    value={form.education.bachelors.field}
                    onChange={(e) =>
                      updateSection('education', {
                        ...form.education,
                        bachelors: { ...form.education.bachelors, field: e.target.value },
                      })
                    }
                  />
                  <CountrySearchSelect
                    required={form.education.diploma.notApplicable}
                    label="Bachelor's Country"
                    error={getFieldError('education.bachelors.country')}
                    options={countryOptions}
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
                      error={getFieldError('education.masters.startDate')}
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
                      error={getFieldError('education.masters.endDate')}
                      placeholder="MM/YYYY"
                      maxLength={7}
                      inputMode="numeric"
                      value={form.education.masters.endDate}
                      onChange={(e) =>
                        updateSection('education', {
                          ...form.education,
                          masters: { ...form.education.masters, endDate: formatEndMonthYearInput(e.target.value) },
                        })
                      }
                    />
                    <Input
                      label="Master's Field of Study"
                      error={getFieldError('education.masters.field')}
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
                      error={getFieldError('education.masters.country')}
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
                <h3 className="font-semibold text-slate-900">Additional Qualifications </h3>
                {form.education.additionalQualifications.map((q, idx) => (
                  <div key={idx} className="relative mt-3 grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
                    {idx > 0 && (
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          updateSection('education', {
                            ...form.education,
                            additionalQualifications: form.education.additionalQualifications.filter((_, qualificationIdx) => qualificationIdx !== idx),
                          });
                        }}
                        aria-label="Remove qualification"
                      >
                        x
                      </button>
                    )}
                    <Input label="Qualification Name" error={getFieldError(`education.additionalQualifications.${idx}.qualificationName`)} value={q.qualificationName} onChange={(e) => {
                      const next = [...form.education.additionalQualifications];
                      next[idx].qualificationName = e.target.value;
                      updateSection('education', { ...form.education, additionalQualifications: next });
                    }} />
                    <Input label="Field" error={getFieldError(`education.additionalQualifications.${idx}.field`)} value={q.field} onChange={(e) => {
                      const next = [...form.education.additionalQualifications];
                      next[idx].field = e.target.value;
                      updateSection('education', { ...form.education, additionalQualifications: next });
                    }} />
                    <Input label="Start (MM/YYYY)" error={getFieldError(`education.additionalQualifications.${idx}.startDate`)} maxLength={7} inputMode="numeric" value={q.startDate} onChange={(e) => {
                      const next = [...form.education.additionalQualifications];
                      next[idx].startDate = formatMonthYearInput(e.target.value);
                      updateSection('education', { ...form.education, additionalQualifications: next });
                    }} />
                    <Input label="End (MM/YYYY)" error={getFieldError(`education.additionalQualifications.${idx}.endDate`)} maxLength={7} inputMode="numeric" value={q.endDate} onChange={(e) => {
                      const next = [...form.education.additionalQualifications];
                      next[idx].endDate = formatEndMonthYearInput(e.target.value);
                      updateSection('education', { ...form.education, additionalQualifications: next });
                    }} />
                  </div>
                ))}
                <Button className="mt-3 text-white" variant="secondary" onClick={() => {
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
              <h3 className="font-semibold text-slate-900">Certifications</h3>
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
                  <Input label="Certification Name" error={getFieldError(`certifications.${idx}.certificationName`)} value={c.certificationName} onChange={(e) => {
                    const next = [...form.certifications];
                    next[idx].certificationName = e.target.value;
                    updateSection('certifications', next);
                  }} />
                  <Input label="Issuing Organization / Platform" error={getFieldError(`certifications.${idx}.issuingOrganization`)} value={c.issuingOrganization} onChange={(e) => {
                    const next = [...form.certifications];
                    next[idx].issuingOrganization = e.target.value;
                    updateSection('certifications', next);
                  }} />
                  <Input label="Year Completed" error={getFieldError(`certifications.${idx}.yearCompleted`)} value={c.yearCompleted} onChange={(e) => {
                    const next = [...form.certifications];
                    next[idx].yearCompleted = formatYearInput(e.target.value);
                    updateSection('certifications', next);
                  }} placeholder="YYYY" maxLength={4} inputMode="numeric" />
                </div>
              ))}
              <Button className="mt-3 text-white" variant="secondary" onClick={() => {
                if (form.certifications.length >= 10) {
                  setListLimitMessage('certifications', 'You can add up to 10 certifications only.');
                  return;
                }
                setListLimitMessage('certifications', '');
                updateSection('certifications', [...form.certifications, blankCertification()]);
              }}>
                Add Certification
              </Button>
              {listLimitMessages.certifications && (
                <p className="mt-2 text-sm text-amber-700">{listLimitMessages.certifications}</p>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h3 className="font-semibold text-slate-900">Work Experience</h3>
              {form.workExperience.filter((item) => item.experienceType !== 'internship').map((w, idx) => (
                <div key={idx} className="relative mt-3 grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
                  {idx > 0 && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        const { workRows, internshipRows } = splitExperience();
                        const nextWorkRows = workRows.filter((_, workIdx) => workIdx !== idx);
                        updateExperienceLists(nextWorkRows, internshipRows);
                      }}
                      aria-label="Remove experience"
                    >
                      x
                    </button>
                  )}
                  <Input label="Organization Name" error={getFieldError(`workExperience.${idx}.organizationName`)} value={w.organizationName} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...workRows];
                    next[idx].organizationName = e.target.value;
                    updateExperienceLists(next, internshipRows);
                  }} />
                  <Input label="Job Title" error={getFieldError(`workExperience.${idx}.jobTitle`)} value={w.jobTitle} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...workRows];
                    next[idx].jobTitle = e.target.value;
                    updateExperienceLists(next, internshipRows);
                  }} />
                  <Input label="Key Responsibilities" error={getFieldError(`workExperience.${idx}.responsibilities`)} value={w.responsibilities} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...workRows];
                    next[idx].responsibilities = e.target.value;
                    updateExperienceLists(next, internshipRows);
                  }} />
                  <CountrySearchSelect label="Country" error={getFieldError(`workExperience.${idx}.country`)} options={countryOptions} value={w.country} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...workRows];
                    next[idx].country = e.target.value;
                    updateExperienceLists(next, internshipRows);
                  }} />
                  <Input label="Start Date (MM/YYYY)" error={getFieldError(`workExperience.${idx}.startDate`)} maxLength={7} inputMode="numeric" value={w.startDate} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...workRows];
                    next[idx].startDate = formatMonthYearInput(e.target.value);
                    updateExperienceLists(next, internshipRows);
                  }} />
                  {!w.currentlyWorkingHere && (
                    <Input label="End Date (MM/YYYY)" error={getFieldError(`workExperience.${idx}.endDate`)} maxLength={7} inputMode="numeric" value={w.endDate} onChange={(e) => {
                      const { workRows, internshipRows } = splitExperience();
                      const next = [...workRows];
                      next[idx].endDate = formatEndMonthYearInput(e.target.value);
                      updateExperienceLists(next, internshipRows);
                    }} />
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={w.currentlyWorkingHere}
                      onChange={(e) => {
                        const { workRows, internshipRows } = splitExperience();
                        const next = [...workRows];
                        next[idx].currentlyWorkingHere = e.target.checked;
                        if (e.target.checked) {
                          next[idx].endDate = '';
                        }
                        updateExperienceLists(next, internshipRows);
                      }}
                    />
                    Currently Working Here
                  </label>
                </div>
              ))}
              <Button className="mt-3 text-white" variant="secondary" onClick={() => {
                const workCount = form.workExperience.filter((item) => item.experienceType !== 'internship').length;
                if (workCount >= 10) {
                  setListLimitMessage('work', 'You can add up to 10 work experience entries only.');
                  return;
                }
                setListLimitMessage('work', '');
                updateSection('workExperience', [...form.workExperience, blankWork('work')]);
              }}>
                Add Experience
              </Button>
              {listLimitMessages.work && (
                <p className="mt-2 text-sm text-amber-700">{listLimitMessages.work}</p>
              )}

              <h3 className="mt-6 font-semibold text-slate-900">Internships</h3>
              {form.workExperience.filter((item) => item.experienceType === 'internship').map((w, idx) => (
                <div key={`intern-${idx}`} className="relative mt-3 grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
                  {idx > 0 && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        const { workRows, internshipRows } = splitExperience();
                        const nextInternships = internshipRows.filter((_, internIdx) => internIdx !== idx);
                        updateExperienceLists(workRows, nextInternships);
                      }}
                      aria-label="Remove internship"
                    >
                      x
                    </button>
                  )}
                  <Input label="Organization Name" value={w.organizationName} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...internshipRows];
                    next[idx].organizationName = e.target.value;
                    updateExperienceLists(workRows, next);
                  }} />
                  <Input label="Role / Title" value={w.jobTitle} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...internshipRows];
                    next[idx].jobTitle = e.target.value;
                    updateExperienceLists(workRows, next);
                  }} />
                  <Input label="Key Responsibilities" value={w.responsibilities} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...internshipRows];
                    next[idx].responsibilities = e.target.value;
                    updateExperienceLists(workRows, next);
                  }} />
                  <CountrySearchSelect label="Country" options={countryOptions} value={w.country} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...internshipRows];
                    next[idx].country = e.target.value;
                    updateExperienceLists(workRows, next);
                  }} />
                  <Input label="Start Date (MM/YYYY)" maxLength={7} inputMode="numeric" value={w.startDate} onChange={(e) => {
                    const { workRows, internshipRows } = splitExperience();
                    const next = [...internshipRows];
                    next[idx].startDate = formatMonthYearInput(e.target.value);
                    updateExperienceLists(workRows, next);
                  }} />
                  {!w.currentlyWorkingHere && (
                    <Input label="End Date (MM/YYYY)" maxLength={7} inputMode="numeric" value={w.endDate} onChange={(e) => {
                      const { workRows, internshipRows } = splitExperience();
                      const next = [...internshipRows];
                      next[idx].endDate = formatEndMonthYearInput(e.target.value);
                      updateExperienceLists(workRows, next);
                    }} />
                  )}
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={w.currentlyWorkingHere}
                      onChange={(e) => {
                        const { workRows, internshipRows } = splitExperience();
                        const next = [...internshipRows];
                        next[idx].currentlyWorkingHere = e.target.checked;
                        if (e.target.checked) {
                          next[idx].endDate = '';
                        }
                        updateExperienceLists(workRows, next);
                      }}
                    />
                    Currently Working Here
                  </label>
                </div>
              ))}
              <Button className="mt-3 text-white" variant="secondary" onClick={() => {
                const internshipCount = form.workExperience.filter((item) => item.experienceType === 'internship').length;
                if (internshipCount >= 10) {
                  setListLimitMessage('internships', 'You can add up to 10 internship entries only.');
                  return;
                }
                setListLimitMessage('internships', '');
                updateSection('workExperience', [...form.workExperience, blankWork('internship')]);
              }}>
                Add Internship
              </Button>
              {listLimitMessages.internships && (
                <p className="mt-2 text-sm text-amber-700">{listLimitMessages.internships}</p>
              )}
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
                    className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/15 ${getFieldError('skills.technical') ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}`.trim()}
                    value={technicalSkillInput}
                    onChange={(e) => setTechnicalSkillInput(e.target.value)}
                    placeholder="Type a skill"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'NumpadEnter') {
                        e.preventDefault();
                        addTechnicalSkill();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTechnicalSkill} className="px-4" aria-label="Add skill">
                    +
                  </Button>
                </div>
                {getFieldError('skills.technical') && <span className="mt-1 block text-xs text-rose-600">{getFieldError('skills.technical')}</span>}
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
                label="Soft Skills"
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
                  <Select
                    required={idx === 0}
                    label="Language"
                    error={getFieldError(`languages.${idx}.language`)}
                    options={languageOptions.filter((option) => {
                      const selectedInOtherRows = form.languages.some((item, itemIdx) => itemIdx !== idx && item.language === option);
                      return !selectedInOtherRows || lang.language === option;
                    })}
                    value={lang.language}
                    onChange={(e) => {
                      const next = [...form.languages];
                      next[idx].language = e.target.value;
                      updateSection('languages', next);
                    }}
                  />
                  <Select
                    required={idx === 0}
                    label="Proficiency Level"
                    error={getFieldError(`languages.${idx}.proficiencyLevel`)}
                    options={['B1', 'B2', 'C1', 'C2']}
                    value={lang.proficiencyLevel}
                    onChange={(e) => {
                      const next = [...form.languages];
                      next[idx].proficiencyLevel = e.target.value;
                      updateSection('languages', next);
                    }}
                  />
                </div>
              ))}
              {canAddLanguage ? (
                <Button className="mt-3 text-white" variant="secondary" onClick={() => updateSection('languages', [...form.languages, blankLanguage()])}>
                  Add Language
                </Button>
              ) : null}
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
                  {!isApprovedProfileView && <Button className="text-white" variant="secondary" onClick={() => goToStep(1)}>Edit</Button>}
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
                                  </div>
              </Card>

              <Card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Education</h3>
                  {!isApprovedProfileView && <Button className="text-white" variant="secondary" onClick={() => goToStep(2)}>Edit</Button>}
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
                  {!isApprovedProfileView && <Button className="text-white" variant="secondary" onClick={() => goToStep(3)}>Edit</Button>}
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
                  {!isApprovedProfileView && <Button className="text-white" variant="secondary" onClick={() => goToStep(4)}>Edit</Button>}
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
                  {!isApprovedProfileView && <Button className="text-white" variant="secondary" onClick={() => goToStep(5)}>Edit</Button>}
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
                  {!isApprovedProfileView && <Button className="text-white" variant="secondary" onClick={() => goToStep(6)}>Edit</Button>}
                </div>
                {form.languages.some((lang) => lang.language || lang.proficiencyLevel) ? (
                  <div className="space-y-3 text-sm">
                    {form.languages
                      .filter((lang) => lang.language || lang.proficiencyLevel)
                      .map((lang, idx) => (
                        <div key={idx} className="rounded-lg bg-white p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Language {idx + 1}</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div><p className="text-slate-500">Language</p><p className="font-medium text-slate-900">{reviewValue(lang.language)}</p></div>
                            <div><p className="text-slate-500">Proficiency Level</p><p className="font-medium text-slate-900">{reviewValue(lang.proficiencyLevel)}</p></div>
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
                  {!isApprovedProfileView && <Button className="text-white" variant="secondary" onClick={() => goToStep(7)}>Edit</Button>}
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
              <Button
                variant="secondary"
                className="bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
                onClick={() => goToStep(currentStep - 1)}
                disabled={savingDraft || loading}
              >
                Back
              </Button>
            )}
            {currentStep < 8 && (
              <Button onClick={handleSaveAndContinue} disabled={savingDraft || loading}>
                {savingDraft ? 'Saving...' : 'Save & Continue'}
              </Button>
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
            <li>First installment payment is USD 3,100 (includes bank fees), refundable minus USD 200 only if not selected post-interview or in valid visa rejection scenarios per agreement.</li>
            <li>USD 4,000 payable upon successful selection</li>
          </ul>
          <p className="mt-3 rounded-md bg-amber-50 p-2 text-white">
            This fee supports evaluation and process coordination services. It does not promise employment outcomes.
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
        loading={loading}
        metaFields={{
          fullName: fullName || 'Not available',
          dateTime: signedDateTime,
          location: 'Auto-captured',
        }}
        onConfirm={(sig) => {
          setSignature(sig);
          submitProfile(sig);
        }}
      />
      <div className="relative z-30 lg:ml-64">
        <Footer />
      </div>
    </div>
  );
}
