const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Profile = require('../models/Profile');
const User = require('../models/User');
const Eligibility = require('../models/Eligibility');
const generatePdf = require('../utils/generatePdf');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { getWorkflowConfig, sendAdminNotification } = require('../utils/workflowEmailer');
const sendEmail = require('../utils/sendEmail');

const clampSavedStep = (value, fallback = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(8, Math.max(1, Math.trunc(numeric)));
};

const normalizeEmail = (value = '') => String(value || '').toLowerCase().trim();

const resolveEligibilityByAccess = async ({ eligibilityId, email }) => {
  const normalizedEmail = normalizeEmail(email);
  const eligibility = eligibilityId
    ? await Eligibility.findById(eligibilityId)
    : await Eligibility.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });

  if (!eligibility) {
    const error = new Error('Complete and pass eligibility check before profile submission');
    error.statusCode = 403;
    throw error;
  }

  if (!eligibility.isEligible) {
    const error = new Error('Complete and pass eligibility check before profile submission');
    error.statusCode = 403;
    throw error;
  }

  if (normalizedEmail && normalizeEmail(eligibility.email) !== normalizedEmail) {
    const error = new Error('Eligibility email does not match the submitted profile email');
    error.statusCode = 403;
    throw error;
  }

  return eligibility;
};

const createPlaceholderCandidateUser = async ({ email, name, eligibility }) => {
  const normalizedEmail = normalizeEmail(email);
  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    user = await User.create({
      name: name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      passwordHash,
      role: 'candidate',
      status: 'profile_submitted',
      evaluationStatus: 'pending',
      operationsStatus: 'pending',
      accountStatus: 'not_invited',
      emailVerified: false,
      phoneVerified: false,
      accountCreationInviteSent: false,
    });
  }

  if (eligibility && !eligibility.userId) {
    eligibility.userId = user._id;
    await eligibility.save();
  }

  return user;
};

const ensureEligible = async (userId) => {
  const eligibility = await Eligibility.findOne({ userId, isEligible: true }).sort({ createdAt: -1 });
  if (!eligibility) {
    const error = new Error('Complete and pass eligibility check before profile submission');
    error.statusCode = 403;
    throw error;
  }
};

const getProfileByAccess = async ({ userId = null, email = '', eligibilityId = '' }) => {
  if (userId) {
    return Profile.findOne({ userId }).sort({ createdAt: -1 });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const query = { email: normalizedEmail };
  if (eligibilityId) query.eligibilityId = eligibilityId;
  return Profile.findOne(query).sort({ createdAt: -1 });
};

const applyProfileFields = (profile, body = {}) => {
  if ('email' in body) profile.email = normalizeEmail(body.email || profile.email || '');
  if ('eligibilityId' in body) profile.eligibilityId = body.eligibilityId || profile.eligibilityId || null;
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

  const applicationSubmittedAt = new Date();
  await User.findByIdAndUpdate(userId, {
    status: 'awaiting_evaluation_review',
    applicationSubmittedAt,
    evaluationStatus: 'pending',
    operationsStatus: 'pending',
  });

  if (body.signature?.value) {
    profile.signature = {
      ...(body.signature || {}),
      audit: {
        ...(body.signature?.audit || {}),
        ...collectSignatureAudit(req),
      },
    };
  }

  const recipientEmail = body.email || body.personalDetails?.email || req.user?.email;
  const candidateDisplayName = body.personalDetails?.firstName || req.user?.name || req.user?.email?.split('@')[0];
  
  // Send confirmation to candidate
  const applicationConfirmationText = `Dear ${candidateDisplayName},

Your profile has been successfully submitted to NextStep Talent for evaluation.

Our evaluation team will review your submitted profile, qualifications, experience, certifications, and language skills.

Please note:
- Profile submission does not guarantee approval.
- Only approved candidates will receive account creation invitations.
- You will be notified via email once your profile has been reviewed.

Thank you for your interest in NextStep Talent.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
  
  await sendEmail({
    to: recipientEmail,
    subject: 'NextStep Talent – Profile Submitted for Evaluation',
    text: applicationConfirmationText,
    html: applicationConfirmationText.replaceAll('\n', '<br/>'),
    fromEmail: 'noreply@nextsteptalent.net',
    fromName: 'NextStep Talent Team',
    templateKey: 'profile_submission_confirmation',
    relatedCandidateId: userId,
  });

  // Send notification to Super Admin and Evaluation Admin
  try {
    const workflow = getWorkflowConfig();
    const evaluationAdminEmail = process.env.EVALUATION_ADMIN_EMAIL || '';
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
    const notificationRecipients = [superAdminEmail, evaluationAdminEmail].filter(Boolean);
    
    if (notificationRecipients.length) {
      const positionOrCategory = String(
        body?.personalDetails?.position ||
        body?.personalDetails?.desiredPosition ||
        body?.personalDetails?.category ||
        body?.skills?.primarySkill ||
        ''
      ).trim() || 'N/A';
      
      await sendAdminNotification({
        to: notificationRecipients,
        subject: `New Candidate Profile Submitted for Evaluation`,
        lines: [
          `Candidate Name: ${candidateDisplayName}`,
          `Email: ${recipientEmail}`,
          `Country: ${body?.personalDetails?.currentCountryOfResidence || 'N/A'}`,
          `Position/Category: ${positionOrCategory}`,
          `Submission Time: ${applicationSubmittedAt.toISOString()}`,
          ``,
          `Action Required: Evaluation Admin must review and approve/reject this profile.`,
          `Review Link: ${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/admin/candidates/${String(userId)}`,
        ],
        fromType: 'noreply',
        templateKey: 'admin_profile_submission_notification',
      });
    }
  } catch (error) {
    console.error('Admin notification failed:', error.message);
  }

  return { profile, statusCode: isNewProfile ? 201 : 200 };
};

const saveDraftProfile = async ({ profile, body }) => {
  applyProfileFields(profile, body);
  profile.status = 'draft';
  profile.generatedPdfUrl = '';
  await profile.save();
  await sendStepUpdateEmail({
    to: body?.email || body?.personalDetails?.email || '',
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

const finalizeOrDraftProfile = async ({ req, body, userId, profile, isNewProfile, eligibility = null }) => {
  if (body.status === 'draft') {
    const draftProfile = await saveDraftProfile({ profile, body });
    return { profile: draftProfile, statusCode: isNewProfile ? 201 : 200 };
  }

  const { profile: savedProfile, statusCode } = await finalizeSubmission({
    req,
    profile,
    body,
    userId,
    isNewProfile,
  });

  if (eligibility) {
    eligibility.profileSubmittedAt = eligibility.profileSubmittedAt || new Date();
    await eligibility.save();
  }

  return { profile: savedProfile, statusCode };
};

const createOrUpdateProfileForUser = async ({ req, body, userId }) => {
  await ensureEligible(userId);
  const existingProfile = await Profile.findOne({ userId }).sort({ createdAt: -1 });
  const profile = existingProfile || new Profile({ userId });
  applyProfileFields(profile, body);

  if (!existingProfile && body.status === 'draft') {
    profile.status = 'draft';
    profile.generatedPdfUrl = '';
    await profile.save();
    return { profile, statusCode: 201 };
  }

  return finalizeOrDraftProfile({
    req,
    body,
    userId,
    profile,
    isNewProfile: !existingProfile,
  });
};

const createOrUpdateProfileForPublicAccess = async ({ req, body }) => {
  const email = normalizeEmail(body.email || body?.personalDetails?.email || '');
  const eligibilityId = String(body.eligibilityId || '').trim();
  const eligibility = await resolveEligibilityByAccess({ eligibilityId, email });
  const user = await createPlaceholderCandidateUser({ email, name: body?.personalDetails?.firstName || email.split('@')[0], eligibility });

  const existingProfile = await Profile.findOne({ userId: user._id }).sort({ createdAt: -1 });
  let profile = existingProfile;
  if (!profile) {
    profile = new Profile({ userId: user._id, email, eligibilityId: eligibility._id });
  }

  applyProfileFields(profile, { ...body, email, eligibilityId: eligibility._id });
  profile.userId = user._id;
  profile.email = email;
  profile.eligibilityId = eligibility._id;

  const result = await finalizeOrDraftProfile({
    req,
    body: { ...body, email, eligibilityId: eligibility._id },
    userId: user._id,
    profile,
    isNewProfile: !existingProfile,
    eligibility,
  });

  await User.findByIdAndUpdate(user._id, {
    status: body.status === 'draft' ? 'profile_submitted' : 'profile_submitted',
    applicationSubmittedAt: body.status === 'draft' ? null : new Date(),
    evaluationStatus: 'submitted',
    accountCreationInviteSent: false,
  });

  return result;
};

const createProfile = async (req, res) => {
  try {
    const { profile, statusCode } = await createOrUpdateProfileForUser({ req, body: req.body, userId: req.user?._id });
    res.status(statusCode).json(profile);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const createPublicProfile = async (req, res) => {
  try {
    const { profile, statusCode } = await createOrUpdateProfileForPublicAccess({ req, body: req.body });
    res.status(statusCode).json(profile);
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

const getPublicProfile = async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email || req.body?.email || '');
    const eligibilityId = String(req.query?.eligibilityId || req.body?.eligibilityId || '').trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const profile = await getProfileByAccess({ email, eligibilityId });
    res.json(profile || null);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    await ensureEligible(req.user._id);
    const profile = await getProfileByAccess({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const { profile: savedProfile } = await finalizeOrDraftProfile({
      req,
      body: req.body,
      userId: req.user._id,
      profile,
      isNewProfile: false,
    });

    res.json(savedProfile);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updatePublicProfile = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || req.body?.personalDetails?.email || '');
    const eligibilityId = String(req.body?.eligibilityId || '').trim();
    const eligibility = await resolveEligibilityByAccess({ eligibilityId, email });
    const profile = await getProfileByAccess({ email, eligibilityId: String(eligibility._id) });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const { profile: savedProfile } = await finalizeOrDraftProfile({
      req,
      body: { ...req.body, email, eligibilityId: String(eligibility._id) },
      userId: profile.userId,
      profile,
      isNewProfile: false,
      eligibility,
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

    res.json({ pdfUrl, fileName: generatePdf.getProfilePdfFileName(profile) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const downloadProfilePdf = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const { buffer, fileName } = await generatePdf.generateProfilePdfBuffer(profile);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProfile,
  createPublicProfile,
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  updatePublicProfile,
  generateProfilePdf,
  downloadProfilePdf,
};
