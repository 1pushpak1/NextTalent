import api from '../api/axios';

export default async function claimEligibilityIfPresent() {
  const eligibilityId = localStorage.getItem('nst_eligibility_id');
  const eligibleFlag = localStorage.getItem('nst_eligible');

  if (!eligibilityId || eligibleFlag !== 'true') return;

  try {
    await api.post('/eligibility/claim', { eligibilityId });
    localStorage.removeItem('nst_eligibility_id');
  } catch (error) {
    console.error('Eligibility claim failed:', error?.response?.data || error.message);
  }
}
