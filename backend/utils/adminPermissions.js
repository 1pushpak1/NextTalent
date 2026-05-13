const { ADMIN_ROLES, normalizeAdminRole } = require('../constants/workflow');

const ALL_PERMISSIONS = [
  'candidates:read',
  'candidates:update',
  'evaluation:approve',
  'evaluation:reject',
  'documents:verify',
  'payments:verify',
  'payments:manage',
  'operations:decide',
  'operations:sterling',
  'interviews:manage',
  'notes:manage',
  'admin:manage',
  'approval:read_audit_full',
  'approval:read_audit_limited',
  'approval:create',
  'invoices:generate',
  'receipts:generate',
  'notifications:send',
];

const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ADMIN_ROLES.PAYMENTS_ADMIN]: [
    'candidates:read',
    'payments:verify',
    'payments:manage',
    'invoices:generate',
    'receipts:generate',
    'notifications:send',
    'approval:read_audit_limited',
    'approval:create',
  ],
  [ADMIN_ROLES.EVALUATION_ADMIN]: [
    'candidates:read',
    'evaluation:approve',
    'evaluation:reject',
    'documents:verify',
    'candidates:update',
    'notes:manage',
    'approval:read_audit_limited',
    'approval:create',
  ],
  [ADMIN_ROLES.OPERATIONS_ADMIN]: [
    'candidates:read',
    'candidates:update',
    'operations:decide',
    'operations:sterling',
    'interviews:manage',
    'notes:manage',
    'approval:read_audit_limited',
    'approval:create',
  ],
};

const getPermissionsForRole = (role) => ROLE_PERMISSIONS[normalizeAdminRole(role)] || [];

const parseAdminUsersFromEnv = () => {
  const raw = process.env.ADMIN_USERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => ({
        email: String(entry?.email || '').toLowerCase().trim(),
        password: String(entry?.password || ''),
        name: String(entry?.name || entry?.email?.split('@')?.[0] || 'Admin User').trim(),
        role: normalizeAdminRole(entry?.role) || ADMIN_ROLES.OPERATIONS_ADMIN,
      }))
      .filter((entry) => entry.email && entry.password && ROLE_PERMISSIONS[entry.role]);
  } catch {
    return [];
  }
};

const parseSeparateRoleAdmins = () => {
  const roleEnvConfig = [
    {
      role: ADMIN_ROLES.SUPER_ADMIN,
      emailKey: 'SUPER_ADMIN_EMAIL',
      passwordKey: 'SUPER_ADMIN_PASSWORD',
      nameKey: 'SUPER_ADMIN_NAME',
      defaultName: 'Super Admin',
    },
    {
      role: ADMIN_ROLES.PAYMENTS_ADMIN,
      emailKey: 'PAYMENT_ADMIN_EMAIL',
      passwordKey: 'PAYMENT_ADMIN_PASSWORD',
      nameKey: 'PAYMENT_ADMIN_NAME',
      defaultName: 'Payments Admin',
    },
    {
      role: ADMIN_ROLES.EVALUATION_ADMIN,
      emailKey: 'EVALUATION_ADMIN_EMAIL',
      passwordKey: 'EVALUATION_ADMIN_PASSWORD',
      nameKey: 'EVALUATION_ADMIN_NAME',
      defaultName: 'Evaluation Admin',
    },
    {
      role: ADMIN_ROLES.OPERATIONS_ADMIN,
      emailKey: 'OPERATIONS_ADMIN_EMAIL',
      passwordKey: 'OPERATIONS_ADMIN_PASSWORD',
      nameKey: 'OPERATIONS_ADMIN_NAME',
      defaultName: 'Operations Admin',
    },
  ];

  return roleEnvConfig
    .map((cfg) => ({
      email: String(process.env[cfg.emailKey] || '').toLowerCase().trim(),
      password: String(process.env[cfg.passwordKey] || ''),
      name: String(process.env[cfg.nameKey] || cfg.defaultName).trim(),
      role: cfg.role,
    }))
    .filter((entry) => entry.email && entry.password);
};

const getConfiguredAdminUsers = () => {
  const separateAdmins = parseSeparateRoleAdmins();
  if (separateAdmins.length) return separateAdmins;

  const users = parseAdminUsersFromEnv();
  if (users.length) return users;

  const legacyEmail = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const legacyPassword = String(process.env.ADMIN_PASSWORD || '');
  if (!legacyEmail || !legacyPassword) return [];

  return [{
    email: legacyEmail,
    password: legacyPassword,
    name: String(process.env.ADMIN_NAME || 'Platform Admin'),
    role: ADMIN_ROLES.SUPER_ADMIN,
  }];
};

module.exports = {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  getConfiguredAdminUsers,
};
