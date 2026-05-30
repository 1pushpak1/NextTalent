const ACCEPTED_QUALIFICATIONS = Object.freeze([
  'Diploma with one year practical training',
  'Bachelor\'s',
  'Bachelor’s',
  'Master’s',
  "Master's",
]);

const SUPPORTED_COUNTRIES = Object.freeze(['Germany', 'Poland', 'Switzerland', 'Austria']);

const pushIf = (arr, condition, message) => {
  if (!condition) arr.push(message);
};

const validateGermany = ({ hasITBackground, qualification, languageAnswer }) => {
  const failedConditions = [];
  pushIf(failedConditions, hasITBackground === true, 'IT background must be Yes');
  pushIf(
    failedConditions,
    ACCEPTED_QUALIFICATIONS.includes(String(qualification || '').trim()),
    'Highest qualification must be one of: Diploma with one year practical training, Bachelor\'s, Master\'s'
  );
  pushIf(failedConditions, languageAnswer === 'Yes', 'Certified German B2 or above must be Yes');
  return failedConditions;
};

const validatePoland = ({ hasITBackground, languageAnswer, currentLocation }) => {
  const failedConditions = [];
  pushIf(failedConditions, hasITBackground === true, 'IT background must be Yes');
  pushIf(failedConditions, languageAnswer === 'Yes', 'Professional English proficiency must be Yes');
  pushIf(failedConditions, currentLocation === 'Europe', 'Current location must be Europe');
  return failedConditions;
};

const validateSwitzerland = ({ hasITBackground, languageAnswer, currentLocation }) => {
  const failedConditions = [];
  pushIf(failedConditions, hasITBackground === true, 'IT background must be Yes');
  pushIf(
    failedConditions,
    languageAnswer && languageAnswer !== 'No',
    'Certified B2 or above in German, French, or Italian is required'
  );
  pushIf(failedConditions, currentLocation === 'Europe', 'Current location must be Europe');
  return failedConditions;
};

const validateAustria = ({ hasITBackground, languageAnswer, currentLocation }) => {
  const failedConditions = [];
  pushIf(failedConditions, hasITBackground === true, 'IT background must be Yes');
  pushIf(failedConditions, languageAnswer === 'Yes', 'Certified German B2 or above must be Yes');
  pushIf(failedConditions, currentLocation === 'Europe', 'Current location must be Europe');
  return failedConditions;
};

const COUNTRY_VALIDATORS = Object.freeze({
  Germany: validateGermany,
  Poland: validatePoland,
  Switzerland: validateSwitzerland,
  Austria: validateAustria,
});

const runEligibilityCheck = (payload) => {
  const destination = String(payload?.destination || '').trim();
  const country = String(payload?.country || '').trim();

  if (!destination) {
    return { isEligible: false, rejectionReason: 'Destination is required.', failedConditions: ['Destination is required.'] };
  }
  if (!country) {
    return { isEligible: false, rejectionReason: 'Country is required.', failedConditions: ['Country is required.'] };
  }
  if (destination !== 'Europe Active') {
    return {
      isEligible: false,
      rejectionReason: 'Selected destination is not open yet.',
      failedConditions: ['Selected destination is not open yet.'],
    };
  }
  if (!SUPPORTED_COUNTRIES.includes(country)) {
    return { isEligible: false, rejectionReason: 'Unsupported country.', failedConditions: ['Unsupported country.'] };
  }
  const failedConditions = [];

  // Global checks: candidate must be willing to relocate and accept fees
  pushIf(failedConditions, payload.willingToRelocate === true, 'Willingness to relocate must be Yes');
  pushIf(failedConditions, payload.comfortableWithFees === true, 'Acceptance of program/service fees must be Yes');

  // Country-specific checks
  failedConditions.push(...COUNTRY_VALIDATORS[country](payload));
  return {
    isEligible: failedConditions.length === 0,
    rejectionReason: failedConditions.length ? failedConditions.join('. ') : '',
    failedConditions,
  };
};

module.exports = {
  ACCEPTED_QUALIFICATIONS,
  SUPPORTED_COUNTRIES,
  runEligibilityCheck,
};
