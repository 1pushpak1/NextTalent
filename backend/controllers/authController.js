const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Eligibility = require('../models/Eligibility');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { getConfiguredAdminUsers, getPermissionsForRole } = require('../utils/adminPermissions');

const findConfiguredAdminByEmail = (email) =>
  getConfiguredAdminUsers().find((entry) => entry.email === String(email || '').toLowerCase().trim());

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const getFrontendBaseUrl = () =>
  String(process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

const createEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

const sendVerificationEmail = async (user) => {
  const { token, hash } = createEmailVerificationToken();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const verifyUrl = `${getFrontendBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  await sendStepUpdateEmail({
    to: user.email,
    candidateName: user.name || user.email.split('@')[0],
    stepKey: 'account',
    heading: 'Verify your email address',
    message: 'Please verify your email to continue your application. This link will expire in 30 minutes.',
    status: 'pending',
    details: [{ label: 'Verification Link Expiry', value: '30 minutes' }],
    cta: { label: 'Verify Email', url: verifyUrl },
  });
};

const signup = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Email and password fields are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail && findConfiguredAdminByEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'This email is reserved for admin login' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const latestEligibilityForEmail = await Eligibility.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (!latestEligibilityForEmail || !latestEligibilityForEmail.isEligible) {
      return res.status(403).json({ message: 'Please complete and pass initial eligibility using this email before signup.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: email.split('@')[0],
      email,
      passwordHash,
      role: 'candidate',
      status: 'account_created',
    });

    await sendVerificationEmail(user);

    await sendStepUpdateEmail({
      to: user.email,
      candidateName: user.name || user.email.split('@')[0],
      stepKey: 'account',
      heading: 'Account created successfully',
      message: 'Your account has been created. Please verify your email to continue.',
      status: 'completed',
      details: [{ label: 'Email', value: user.email }],
      cta: { label: 'Verify Email', url: `${getFrontendBaseUrl()}/verify-email` },
    });

    res.status(201).json({
      message: 'Signup successful',
      token: tokenFor({ id: String(user._id) }),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();
    const configuredAdmin = findConfiguredAdminByEmail(normalizedEmail);
    if (configuredAdmin) {
      if (password !== configuredAdmin.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const permissions = getPermissionsForRole(configuredAdmin.role);

      return res.json({
        token: tokenFor({
          id: 'env-admin',
          role: 'admin',
          email: configuredAdmin.email,
          adminRole: configuredAdmin.role,
          permissions,
          isEnvAdmin: true,
        }),
        role: configuredAdmin.role,
        permissions,
        name: configuredAdmin.name,
        email: configuredAdmin.email,
        user: {
          id: 'env-admin',
          name: configuredAdmin.name,
          email: configuredAdmin.email,
          phone: '',
          emailVerified: true,
          phoneVerified: true,
          role: 'admin',
          adminRole: configuredAdmin.role,
          permissions,
          status: 'admin_active',
        },
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin login is managed via environment credentials' });
    }

    res.json({
      token: tokenFor({ id: String(user._id) }),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification token' });

    user.emailVerified = true;
    user.emailVerificationTokenHash = '';
    user.emailVerificationExpiresAt = null;
    user.status = user.phoneVerified ? user.status : 'email_verified';
    await user.save();

    await sendStepUpdateEmail({
      to: user.email,
      candidateName: user.name || user.email.split('@')[0],
      stepKey: 'account',
      heading: 'Email verified',
      message: 'Your email verification is complete. Please finish the remaining verification step and then complete your profile submission to continue.',
      status: 'completed',
      details: [
        { label: 'Verification', value: 'Email verified' },
        { label: 'Next Step', value: 'Verify phone and complete profile submission' },
      ],
      cta: { label: 'Continue Verification', url: `${getFrontendBaseUrl()}/verify-phone` },
    });

    res.json({ message: 'Email verified', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email is already verified' });

    await sendVerificationEmail(user);
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyPhone = async (req, res) => {
  try {
    const { email, countryCode, phone } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.phone = `${countryCode}${phone}`;
    user.phoneVerified = true;
    user.status = 'phone_verified';
    await user.save();

    await sendStepUpdateEmail({
      to: user.email,
      candidateName: user.name || user.email.split('@')[0],
      stepKey: 'account',
      heading: 'Phone verified',
      message: 'Your account is now fully verified. Please complete your profile submission to move into internal evaluation.',
      status: 'completed',
      details: [
        { label: 'Phone', value: user.phone || `${countryCode}${phone}` },
        { label: 'Next Step', value: 'Complete profile submission' },
      ],
      cta: { label: 'Continue Profile', url: `${getFrontendBaseUrl()}/profile-submission` },
    });

    res.json({ message: 'Phone verified', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, verifyEmail, resendVerificationEmail, verifyPhone };
