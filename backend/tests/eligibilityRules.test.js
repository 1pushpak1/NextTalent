const test = require('node:test');
const assert = require('node:assert/strict');
const { runEligibilityCheck } = require('../utils/eligibilityRules');

const base = {
  destination: 'Europe Active',
  country: 'Germany',
  hasITBackground: true,
  qualification: '',
  languageAnswer: '',
  currentLocation: 'Europe',
  willingToRelocate: true,
  comfortableWithFees: true,
};

test('Germany: Yes + Bachelor + German B2 -> PASS', () => {
  const result = runEligibilityCheck({
    ...base,
    qualification: 'Bachelor’s',
    languageAnswer: 'Yes',
  });
  assert.equal(result.isEligible, true);
  assert.deepEqual(result.failedConditions, []);
});

test('Germany: Yes + Bachelor + No German -> FAIL', () => {
  const result = runEligibilityCheck({
    ...base,
    qualification: 'Bachelor’s',
    languageAnswer: 'No',
  });
  assert.equal(result.isEligible, false);
  assert.match(result.rejectionReason, /Certified German B2 or above must be Yes/);
});

test('Germany: No relocation or fees -> FAIL', () => {
  const result = runEligibilityCheck({
    ...base,
    qualification: 'Bachelor’s',
    languageAnswer: 'Yes',
    willingToRelocate: false,
    comfortableWithFees: false,
  });
  assert.equal(result.isEligible, false);
  assert.match(result.rejectionReason, /Willingness to relocate must be Yes/);
  assert.match(result.rejectionReason, /Acceptance of program\/service fees must be Yes/);
});

test('Poland: Yes + English Yes + Europe -> PASS', () => {
  const result = runEligibilityCheck({
    ...base,
    country: 'Poland',
    languageAnswer: 'Yes',
    currentLocation: 'Europe',
  });
  assert.equal(result.isEligible, true);
});

test('Poland: Yes + English Yes + Outside Europe -> FAIL', () => {
  const result = runEligibilityCheck({
    ...base,
    country: 'Poland',
    languageAnswer: 'Yes',
    currentLocation: 'Outside Europe',
  });
  assert.equal(result.isEligible, false);
  assert.match(result.rejectionReason, /Current location must be Europe/);
});

test('Switzerland: Yes + French B2 + Europe -> PASS', () => {
  const result = runEligibilityCheck({
    ...base,
    country: 'Switzerland',
    languageAnswer: 'French B2 certified or above',
    currentLocation: 'Europe',
    qualification: '',
  });
  assert.equal(result.isEligible, true);
});

test('Switzerland: Yes + No language + Europe -> FAIL', () => {
  const result = runEligibilityCheck({
    ...base,
    country: 'Switzerland',
    languageAnswer: 'No',
    currentLocation: 'Europe',
    qualification: '',
  });
  assert.equal(result.isEligible, false);
  assert.match(result.rejectionReason, /Certified B2 or above in German, French, or Italian is required/);
});

test('Austria: Yes + German B2 + Europe -> PASS', () => {
  const result = runEligibilityCheck({
    ...base,
    country: 'Austria',
    languageAnswer: 'Yes',
    currentLocation: 'Europe',
    qualification: '',
  });
  assert.equal(result.isEligible, true);
});

test('Austria: Yes + German B2 + Outside Europe -> FAIL', () => {
  const result = runEligibilityCheck({
    ...base,
    country: 'Austria',
    languageAnswer: 'Yes',
    currentLocation: 'Outside Europe',
    qualification: '',
  });
  assert.equal(result.isEligible, false);
  assert.match(result.rejectionReason, /Current location must be Europe/);
});

test('Relocation and fees do not affect eligibility', () => {
  const passWithNoRelocationNoFees = runEligibilityCheck({
    ...base,
    country: 'Poland',
    languageAnswer: 'Yes',
    currentLocation: 'Europe',
    willingToRelocate: false,
    comfortableWithFees: false,
  });
  const passWithRelocationAndFees = runEligibilityCheck({
    ...base,
    country: 'Poland',
    languageAnswer: 'Yes',
    currentLocation: 'Europe',
    willingToRelocate: true,
    comfortableWithFees: true,
  });

  assert.equal(passWithNoRelocationNoFees.isEligible, false);
  assert.equal(passWithRelocationAndFees.isEligible, true);
});

test('Global Opportunities: IT + English + relocation + fees -> PASS', () => {
  const result = runEligibilityCheck({
    ...base,
    destination: 'Global Opportunities Active',
    country: 'Canada',
    currentLocation: 'Canada',
    qualification: '',
    languageAnswer: 'Yes',
    willingToRelocate: true,
    comfortableWithFees: true,
  });

  assert.equal(result.isEligible, true);
  assert.deepEqual(result.failedConditions, []);
});

test('Global Opportunities: qualification and current location are optional', () => {
  const result = runEligibilityCheck({
    ...base,
    destination: 'Global Opportunities Active',
    country: 'Global Opportunities',
    currentLocation: '',
    qualification: '',
    languageAnswer: 'Yes',
  });

  assert.equal(result.isEligible, true);
});

test('Global Opportunities: country can be omitted from eligibility logic', () => {
  const result = runEligibilityCheck({
    ...base,
    destination: 'Global Opportunities Active',
    country: '',
    currentLocation: '',
    qualification: '',
    languageAnswer: 'Yes',
  });

  assert.equal(result.isEligible, true);
});
