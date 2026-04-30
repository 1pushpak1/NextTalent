const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const getEnvAdminEmail = () => String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const getEnvAdminPassword = () => String(process.env.ADMIN_PASSWORD || '');
const getEnvAdminName = () => String(process.env.ADMIN_NAME || 'Platform Admin');

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const signup = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Email and password fields are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail && normalizedEmail === getEnvAdminEmail()) {
      return res.status(400).json({ message: 'This email is reserved for admin login' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: email.split('@')[0],
      email,
      passwordHash,
      role: 'candidate',
      status: 'account_created',
    });

    await sendEmail({
      to: user.email,
      subject: 'Verify your email - NextStep Talent',
      text: 'Please verify your email address to continue your candidate pathway account setup.',
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
    const envAdminEmail = getEnvAdminEmail();
    const envAdminPassword = getEnvAdminPassword();

    if (normalizedEmail === envAdminEmail && envAdminEmail && envAdminPassword) {
      if (password !== envAdminPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      return res.json({
        token: tokenFor({
          id: 'env-admin',
          role: 'admin',
          email: envAdminEmail,
          isEnvAdmin: true,
        }),
        user: {
          id: 'env-admin',
          name: getEnvAdminName(),
          email: envAdminEmail,
          phone: '',
          emailVerified: true,
          phoneVerified: true,
          role: 'admin',
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
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.emailVerified = true;
    user.status = user.phoneVerified ? user.status : 'email_verified';
    await user.save();

    res.json({ message: 'Email verified', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendPhoneOtp = async (req, res) => {
  try {
    const { email, countryCode, phone } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.phone = `${countryCode}${phone}`;
    user.phoneOtp = '123456';
    await user.save();

    res.json({ message: 'OTP sent (simulated)', otp: '123456' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyPhone = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.phoneOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.phoneVerified = true;
    user.phoneOtp = '';
    user.status = 'phone_verified';
    await user.save();

    res.json({ message: 'Phone verified', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, verifyEmail, sendPhoneOtp, verifyPhone };
