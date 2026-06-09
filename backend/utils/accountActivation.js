const crypto = require('crypto');
const AccountActivation = require('../models/AccountActivation');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Eligibility = require('../models/Eligibility');

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const normalizeEmail = (value = '') => String(value || '').toLowerCase().trim();

const generateActivationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
};

const hashActivationToken = (token = '') => crypto.createHash('sha256').update(String(token || '').trim()).digest('hex');

const createActivationForCandidate = async ({
  email,
  candidateName = '',
  issuedBy = '',
  issuedForCandidateId = '',
  issuedForUserId = null,
  ttlMs = ACTIVATION_TTL_MS,
} = {}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  const { token, tokenHash } = generateActivationToken();
  const expiresAt = new Date(Date.now() + ttlMs);

  await AccountActivation.deleteMany({ email: normalizedEmail, usedAt: null });
  const activation = await AccountActivation.create({
    email: normalizedEmail,
    candidateName: String(candidateName || '').trim(),
    tokenHash,
    expiresAt,
    usedAt: null,
    usedByUserId: null,
    issuedBy: String(issuedBy || '').trim(),
    issuedForCandidateId: String(issuedForCandidateId || '').trim(),
    issuedForUserId: issuedForUserId || null,
  });

  return { activation, token };
};

const getLatestActiveActivation = async ({ email, token } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const tokenHash = hashActivationToken(token);
  if (!normalizedEmail || !tokenHash) return null;

  const tokenValue = String(token || '').trim();
  return AccountActivation.findOne({
    email: normalizedEmail,
    usedAt: null,
    expiresAt: { $gt: new Date() },
    $or: [{ tokenHash }, { tokenHash: tokenValue }],
  }).sort({ createdAt: -1 });
};

const describeActivationState = (activation) => {
  if (!activation) {
    return { valid: false, code: 'invalid', message: 'Invalid activation link. Please contact support.' };
  }

  if (activation.usedAt) {
    return { valid: false, code: 'used', message: 'This activation link has already been used.' };
  }

  if (activation.expiresAt <= new Date()) {
    return { valid: false, code: 'expired', message: 'Token expired. Please request a new activation link.' };
  }

  return { valid: true, code: 'valid', message: 'Activation link is valid.' };
};

const buildCandidateAccountContext = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const [user, profile, eligibility] = await Promise.all([
    User.findOne({ email: normalizedEmail, role: 'candidate' }).sort({ createdAt: -1 }),
    Profile.findOne({ email: normalizedEmail }).sort({ createdAt: -1 }),
    Eligibility.findOne({ email: normalizedEmail }).sort({ createdAt: -1 }),
  ]);

  return {
    user,
    profile,
    eligibility,
    candidateName:
      profile?.personalDetails?.firstName ||
      eligibility?.fullName ||
      user?.name ||
      normalizedEmail.split('@')[0] ||
      'Candidate',
  };
};

module.exports = {
  ACTIVATION_TTL_MS,
  buildCandidateAccountContext,
  createActivationForCandidate,
  describeActivationState,
  getLatestActiveActivation,
  hashActivationToken,
  normalizeEmail,
};
