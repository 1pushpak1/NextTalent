const Profile = require('../models/Profile');
const User = require('../models/User');
const Eligibility = require('../models/Eligibility');
const generatePdf = require('../utils/generatePdf');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { getWorkflowConfig, sendAdminNotification } = require('../utils/workflowEmailer');

const clampSavedStep = (value, fallback = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(8, Math.max(1, Math.trunc(numeric)));
};

const ensureEligible = async (userId) => {
  const eligibility = await Eligibility.findOne({ userId, isEligible: true }).sort({ createdAt: -1 });
  if (!eligibility) {
    const error = new Error('Complete and pass eligibility check before profile submission');
    error.statusCode = 403;
    throw error;
  }
};

const applyProfileFields = (profile, body = {}) => {
  if ('personalDetails' in body) profile.personalDetails = body.personalDetails || {};
  if ('education' in body) profile.education = body.education || {};
  if ('certifications' in body) profile.certifications = body.certifications || [];
  if ('workExperience' in body) profile.workExperience = body.workExperience || [];
  if ('skills' in body) profile.skills = body.skills || {};
  if ('languages' in body) profile.languages = body.languages || [];
  if ('additionalInfo' in body) profile.additionalInfo = body.additionalInfo || '';
  if ('financialDisclosureAccepted' in body) profile.financialDisclosureAccepted = Boolean(body.financialDisclosureAccepted);
  if ('acknowledgementSigned' in body) profile.acknowledgementSigned = Boolean(body.acknowledgementSigned);
  if ('signature' in body) profile.signature = body.signature || null;
  if ('savedStep' in body) profile.savedStep = clampSavedStep(body.savedStep, profile.savedStep || 1);
};

const collectSignatureAudit = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ipAddress = forwardedFor || req.ip || req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  const sessionId =
    String(req.headers['x-session-id'] || '').trim() ||
    String(req.headers.authorization || '').replace('Bearer ', '').slice(-16);
  return {
    ipAddress,
    userAgent,
    sessionId,
    signedFrom: {
      platform: req.headers['sec-ch-ua-platform'] || '',
      mobile: req.headers['sec-ch-ua-mobile'] || '',
      language: req.headers['accept-language'] || '',
    },
  };
};

const finalizeSubmission = async ({ req, profile, body, userId, isNewProfile }) => {
  if (!body.financialDisclosureAccepted) {
    const error = new Error('Financial disclosure must be accepted');
    error.statusCode = 400;
    throw error;
  }
  if (!body.acknowledgementSigned || !body.signature?.value) {
    const error = new Error('Acknowledgement signature is required');
    error.statusCode = 400;
    throw error;
  }

  applyProfileFields(profile, body);
  profile.status = 'submitted';
  profile.savedStep = 8;

  const pdfUrl = await generatePdf(profile);
  profile.generatedPdfUrl = pdfUrl;
  await profile.save();

  await User.findByIdAndUpdate(userId, { status: 'profile_submitted' });

  if (body.signature?.value) {
    profile.signature = {
      ...(body.signature || {}),
      audit: {
        ...(body.signature?.audit || {}),
        ...collectSignatureAudit(req),
      },
    };
  }

  const recipientEmail = body.personalDetails?.email || req.user?.email;
  const candidateDisplayName = body.personalDetails?.firstName || req.user?.name || req.user?.email?.split('@')[0];
  await sendStepUpdateEmail({
    to: recipientEmail,
    candidateName: candidateDisplayName,
    stepKey: 'profile',
    heading: 'Profile submitted successfully',
    message: 'Your profile has been submitted successfully and is now pending admin approval in internal evaluation.',
    status: 'submitted',
    details: [
      { label: 'Profile Status', value: 'Pending Approval' },
      { label: 'Review Stage', value: 'Internal Evaluation' },
    ],
    cta: { label: 'View Dashboard', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard` },
  });

  const workflow = getWorkflowConfig();
  try {
    await sendAdminNotification({
      to: workflow.admin12List,
      subject: `NextStep Talent Candidate Submission Received / ${candidateDisplayName}`,
      lines: [
        'A new candidate application has been submitted.',
        `Candidate: ${candidateDisplayName}`,
        `Email: ${recipientEmail || req.user?.email || 'N/A'}`,
        `Candidate ID: ${String(userId)}`,
      ],
      fromType: 'noreply',
    });
  } catch (error) {
    console.error('Admin submission notification failed:', error.message);
  }

  return { profile, statusCode: isNewProfile ? 201 : 200 };
};

const saveDraftProfile = async ({ profile, body }) => {
  applyProfileFields(profile, body);
  profile.status = 'draft';
  profile.generatedPdfUrl = '';
  await profile.save();
  await sendStepUpdateEmail({
    to: body?.personalDetails?.email || '',
    candidateName: body?.personalDetails?.firstName || '',
    stepKey: 'profile',
    heading: 'Profile draft saved',
    message: 'Your progress has been saved. You can continue from where you left off.',
    status: 'pending',
    details: [{ label: 'Saved Step', value: String(profile.savedStep || 1) }],
    cta: { label: 'Continue Profile', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/profile-submission` },
  });
  return profile;
};

const createProfile = async (req, res) => {
  try {
    const body = req.body;
    const userId = req.user?._id;

    await ensureEligible(userId);

    const existingProfile = await Profile.findOne({ userId }).sort({ createdAt: -1 });
    if (body.status === 'draft') {
      const profile = existingProfile || new Profile({ userId });
      const draftProfile = await saveDraftProfile({ profile, body });
      return res.status(existingProfile ? 200 : 201).json(draftProfile);
    }

    const profile = existingProfile || new Profile({ userId });
    const { profile: savedProfile, statusCode } = await finalizeSubmission({
      req,
      profile,
      body,
      userId,
      isNewProfile: !existingProfile,
    });

    res.status(statusCode).json(savedProfile);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(profile || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const body = req.body;
    const userId = req.user._id;

    await ensureEligible(userId);

    const isDraftSave = body.status === 'draft';
    let profile = await Profile.findOne({ userId }).sort({ createdAt: -1 });

    if (!profile && !isDraftSave) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (!profile) {
      profile = new Profile({ userId });
    }

    if (isDraftSave) {
      const draftProfile = await saveDraftProfile({ profile, body });
      return res.json(draftProfile);
    }

    const { profile: savedProfile } = await finalizeSubmission({
      req,
      profile,
      body,
      userId,
      isNewProfile: false,
    });

    res.json(savedProfile);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const generateProfilePdf = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const pdfUrl = await generatePdf(profile);
    profile.generatedPdfUrl = pdfUrl;
    await profile.save();

    res.json({ pdfUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProfile, getMyProfile, updateMyProfile, generateProfilePdf };
