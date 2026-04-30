const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const envAdminEmail = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    if (decoded?.isEnvAdmin === true && decoded?.role === 'admin' && decoded?.email === envAdminEmail) {
      req.user = {
        _id: 'env-admin',
        id: 'env-admin',
        name: String(process.env.ADMIN_NAME || 'Platform Admin'),
        email: envAdminEmail,
        role: 'admin',
        emailVerified: true,
        phoneVerified: true,
        status: 'admin_active',
      };
      return next();
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.status(401).json({ message: 'Invalid token user' });
    if (user.role === 'admin') {
      return res.status(401).json({ message: 'Admin authentication is managed via environment credentials' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const envAdminEmail = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    if (decoded?.isEnvAdmin === true && decoded?.role === 'admin' && decoded?.email === envAdminEmail) {
      req.user = {
        _id: 'env-admin',
        id: 'env-admin',
        name: String(process.env.ADMIN_NAME || 'Platform Admin'),
        email: envAdminEmail,
        role: 'admin',
        emailVerified: true,
        phoneVerified: true,
        status: 'admin_active',
      };
      return next();
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (user && user.role !== 'admin') req.user = user;
    next();
  } catch (error) {
    next();
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { protect, optionalAuth, adminOnly };
