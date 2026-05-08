const PROGRAM_FEE_BASE_USD = 3500;
const BACKGROUND_VERIFICATION_USD = 100;
const INDIA_COMPLIANCE_SURCHARGE_USD = 200;

const normalizeCountry = (value = '') => String(value || '').trim().toLowerCase();

const isIndiaResidence = (value = '') => normalizeCountry(value) === 'india';

const getProgramFeeBreakdown = (profile) => {
  const currentCountryOfResidence = profile?.personalDetails?.currentCountryOfResidence || '';
  const indiaSurcharge = isIndiaResidence(currentCountryOfResidence) ? INDIA_COMPLIANCE_SURCHARGE_USD : 0;
  const total = PROGRAM_FEE_BASE_USD + BACKGROUND_VERIFICATION_USD + indiaSurcharge;

  return {
    baseProgramFee: PROGRAM_FEE_BASE_USD,
    backgroundVerificationFee: BACKGROUND_VERIFICATION_USD,
    indiaComplianceSurcharge: indiaSurcharge,
    total,
    currentCountryOfResidence,
    isIndiaResident: indiaSurcharge > 0,
  };
};

module.exports = {
  PROGRAM_FEE_BASE_USD,
  BACKGROUND_VERIFICATION_USD,
  INDIA_COMPLIANCE_SURCHARGE_USD,
  isIndiaResidence,
  getProgramFeeBreakdown,
};
