const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Eligibility = require('../models/Eligibility');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { getConfiguredAdminUsers, getPermissionsForRole } = require('../utils/adminPermissions');
const { normalizeAdminRole } = require('../constants/workflow');
const sendEmail = require('../utils/sendEmail');

const findConfiguredAdminByEmail = (email) =>
  getConfiguredAdminUsers().find((entry) => entry.email === String(email || '').toLowerCase().trim());

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const getFrontendBaseUrl = () =>
  String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

const createEmailVerificationCode = () => {
  const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  return { code, hash };
};

const createPasswordResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

const isStrongPassword = (value = '') =>
  value.length >= 8 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

const sendVerificationEmail = async (user) => {
  const verifyEmailSubject = 'NextStep Talent – Verify Your Email Address';
  const { code, hash } = createEmailVerificationCode();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const verificationLine = `Verification Code: ${code}`;
  const text = `Dear Candidate,

Thank you for registering with NextStep Talent.

To continue with your application process, please verify your email address using the verification code below.

${verificationLine}

This code is valid for a limited period of time.

If you did not initiate this request, please ignore this email.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
  const html = `Dear Candidate,<br/><br/>
Thank you for registering with NextStep Talent.<br/><br/>
To continue with your application process, please verify your email address using the verification code below.<br/><br/>
${verificationLine}<br/><br/>
This code is valid for a limited period of time.<br/><br/>
If you did not initiate this request, please ignore this email.<br/><br/>
Regards,  <br/>
NextStep Talent Team<br/><br/>
This is an automated email. Please do not reply to this message.`;

  await sendEmail({
    to: user.email,
    subject: verifyEmailSubject,
    text,
    html,
    fromEmail: 'noreply@nextsteptalent.net',
    fromName: 'NextStep Talent Team',
    templateKey: 'email_verification_code',
  });

  return true;
};

const signup = async (req, res) => {
  try {
    const { email, password, confirmPassword, inviteToken } = req.body;

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

    // Check if invitation token is required and valid
    if (!inviteToken) {
      return res.status(403).json({ message: 'Account creation requires an invitation. Please check your email for the invitation link.' });
    }

    // Verify invitation token
    const tokenHash = crypto.createHash('sha256').update(String(inviteToken).trim()).digest('hex');
    const invitedUser = await User.findOne({
      email: normalizedEmail,
      accountInviteToken: tokenHash,
      accountInviteExpiresAt: { $gt: new Date() },
      role: 'candidate',
    });

    if (!invitedUser) {
      return res.status(403).json({ message: 'Invalid or expired invitation token. Please contact support.' });
    }

    if (invitedUser.accountStatus !== 'invited') {
      return res.status(403).json({ message: 'This invitation has already been used or is no longer valid.' });
    }

    // Create account
    const passwordHash = await bcrypt.hash(password, 10);
    invitedUser.passwordHash = passwordHash;
    invitedUser.accountStatus = 'created';
    invitedUser.status = 'account_created';
    invitedUser.accountInviteToken = ''; // Clear token after use
    invitedUser.emailVerified = false;
    invitedUser.phoneVerified = false;
    await invitedUser.save();

    await sendVerificationEmail(invitedUser);

    res.status(201).json({
      message: 'Account created successfully',
      token: tokenFor({ id: String(invitedUser._id) }),
      user: {
        id: invitedUser._id,
        name: invitedUser.name,
        email: invitedUser.email,
        emailVerified: invitedUser.emailVerified,
        phoneVerified: invitedUser.phoneVerified,
        role: invitedUser.role,
        status: invitedUser.status,
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
      const adminRole = normalizeAdminRole(configuredAdmin.role);
      const permissions = getPermissionsForRole(adminRole);

      return res.json({
        token: tokenFor({
          id: 'env-admin',
          role: 'admin',
          email: configuredAdmin.email,
          adminRole,
          permissions,
          isEnvAdmin: true,
        }),
        role: adminRole,
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
          adminRole,
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
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and verification code are required' });

    const tokenHash = crypto.createHash('sha256').update(String(code).trim()).digest('hex');
    const user = await User.findOne({
      email: String(email || '').toLowerCase().trim(),
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification code' });

    user.emailVerified = true;
    user.emailVerificationTokenHash = '';
    user.emailVerificationExpiresAt = null;
    user.accountStatus = 'email_verified';
    user.status = 'email_verified';
    await user.save();

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

    res.json({ message: 'Phone verified', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const { token, hash } = createPasswordResetToken();
      user.passwordResetTokenHash = hash;
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const isAdminAccount = user.role === 'admin';
      const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${encodeURIComponent(token)}${isAdminAccount ? '&mode=admin&next=%2Fadmin' : ''}`;
      const subject = isAdminAccount ? 'Reset your NextStep Talent admin password' : 'Reset your NextStep Talent password';
      const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:92%;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(135deg,#00152d,#002147)">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.02em">NextStep Talent</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px">
                <p style="margin:0 0 6px;color:#64748b;font-size:11px;letter-spacing:.08em;text-transform:uppercase">Account Security</p>
                <h1 style="margin:0 0 10px;font-size:24px;line-height:1.3;color:#0b1526">Password reset requested</h1>
                <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.6">We received a request to reset your password. Use the secure button below to set a new password.</p>
                <div style="display:inline-block;background:#eef2ff;color:#1e3a8a;font-size:12px;font-weight:700;padding:6px 10px;border-radius:999px">Expires in 30 minutes</div>
                <div style="margin-top:20px">
                  <a href="${resetUrl}" style="display:inline-block;background:#002147;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:13px">Reset Password</a>
                </div>
                <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.6">If you did not request this, you can ignore this email and your password will remain unchanged.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
      const text = [
        'Password reset requested',
        'Use this link to reset your password (valid for 30 minutes):',
        resetUrl,
        'If you did not request this, you can ignore this email.',
      ].join('\n');

      await sendEmail({
        to: user.email,
        subject,
        text,
        html,
      });
    }

    return res.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'token, newPassword and confirmPassword are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = '';
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.json({ message: 'Password has been reset successfully. Please login with your new password.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, verifyEmail, resendVerificationEmail, verifyPhone, forgotPassword, resetPassword };
