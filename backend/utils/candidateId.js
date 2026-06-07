const User = require('../models/User');

const LEGACY_CANDIDATE_ID_PREFIX = /^nst-cand-/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

const normalizeCandidateIdPart = (value = '') =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatDobSegment = (value) => {
  if (!value) return '';

  const raw = String(value).trim();
  const mmddyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    return `${month}-${day}-${year}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const year = String(parsed.getFullYear());
  return `${month}-${day}-${year}`;
};

const getCandidateIdentityParts = ({ user = null, profile = null, eligibility = null } = {}) => {
  const firstName =
    profile?.personalDetails?.firstName ||
    user?.name?.split?.(/\s+/)?.[0] ||
    eligibility?.fullName?.split?.(/\s+/)?.[0] ||
    '';

  const dob =
    profile?.personalDetails?.dateOfBirth ||
    eligibility?.dateOfBirth ||
    eligibility?.dob ||
    '';

  const country =
    eligibility?.destination ||
    eligibility?.country ||
    profile?.personalDetails?.currentCountryOfResidence ||
    profile?.personalDetails?.countryOfBirth ||
    '';

  return { firstName, dob, country };
};

const buildCandidateIdBase = ({ user = null, profile = null, eligibility = null } = {}) => {
  const { firstName, dob, country } = getCandidateIdentityParts({ user, profile, eligibility });
  const namePart = normalizeCandidateIdPart(firstName);
  const dobPart = formatDobSegment(dob);
  const countryPart = normalizeCandidateIdPart(country);

  if (!namePart || !dobPart || !countryPart) {
    return '';
  }

  return `${namePart}-${dobPart}-${countryPart}`;
};

const isLegacyCandidateId = (value = '') => {
  const candidateId = String(value || '').trim();
  if (!candidateId) return true;
  if (LEGACY_CANDIDATE_ID_PREFIX.test(candidateId)) return true;
  if (UUID_PATTERN.test(candidateId)) return true;
  if (OBJECT_ID_PATTERN.test(candidateId)) return true;
  return false;
};

const ensureUniqueCandidateId = async ({ baseId, userId }) => {
  let candidateId = baseId;
  let suffix = 2;

  while (
    await User.exists({
      candidateId,
      _id: { $ne: userId },
    })
  ) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
};

const ensureCandidateIdForUser = async ({ userId, user = null, profile = null, eligibility = null } = {}) => {
  const candidate = user && typeof user.save === 'function' ? user : await User.findById(userId || user?._id);
  if (!candidate || candidate.role !== 'candidate') return candidate;

  const baseId = buildCandidateIdBase({ user: candidate, profile, eligibility });
  if (!baseId) return candidate;

  const currentId = String(candidate.candidateId || '').trim();
  if (currentId && !isLegacyCandidateId(currentId)) {
    return candidate;
  }

  const nextId = await ensureUniqueCandidateId({ baseId, userId: candidate._id });
  if (currentId !== nextId) {
    candidate.candidateId = nextId;
    await candidate.save();
  }

  return candidate;
};

module.exports = {
  buildCandidateIdBase,
  ensureCandidateIdForUser,
  formatDobSegment,
  isLegacyCandidateId,
  normalizeCandidateIdPart,
};
