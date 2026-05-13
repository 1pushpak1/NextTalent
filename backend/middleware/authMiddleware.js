const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getConfiguredAdminUsers, getPermissionsForRole } = require('../utils/adminPermissions');
const { normalizeAdminRole } = require('../constants/workflow');

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

const findConfiguredAdminByEmail = (email) =>
  getConfiguredAdminUsers().find((entry) => entry.email === String(email || '').toLowerCase().trim());

const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const configuredAdmin = decoded?.isEnvAdmin === true && decoded?.role === 'admin'
      ? findConfiguredAdminByEmail(decoded?.email)
      : null;
    if (configuredAdmin) {
      const adminRole = normalizeAdminRole(configuredAdmin.role);
      req.user = {
        _id: 'env-admin',
        id: 'env-admin',
        name: configuredAdmin.name,
        email: configuredAdmin.email,
        role: 'admin',
        adminRole,
        permissions: getPermissionsForRole(adminRole),
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
    const configuredAdmin = decoded?.isEnvAdmin === true && decoded?.role === 'admin'
      ? findConfiguredAdminByEmail(decoded?.email)
      : null;
    if (configuredAdmin) {
      const adminRole = normalizeAdminRole(configuredAdmin.role);
      req.user = {
        _id: 'env-admin',
        id: 'env-admin',
        name: configuredAdmin.name,
        email: configuredAdmin.email,
        role: 'admin',
        adminRole,
        permissions: getPermissionsForRole(adminRole),
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

const requireAdminPermission = (permission) => (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (!permissions.includes(permission)) {
    return res.status(403).json({ message: `Missing permission: ${permission}` });
  }
  return next();
};

const requireAdminRoles = (roles = []) => {
  const normalizedRoles = roles.map((role) => normalizeAdminRole(role));
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const currentRole = normalizeAdminRole(req.user.adminRole);
    if (!normalizedRoles.includes(currentRole)) {
      return res.status(403).json({ message: `Admin role ${currentRole || 'unknown'} cannot perform this action` });
    }
    return next();
  };
};

module.exports = { protect, optionalAuth, adminOnly, requireAdminPermission, requireAdminRoles };
