const ALL_PERMISSIONS = [
  'candidates:read',
  'candidates:update',
  'evaluation:approve',
  'documents:verify',
  'payments:verify',
  'interviews:manage',
  'notes:manage',
  'admin:manage',
];

const ROLE_PERMISSIONS = {
  super_admin: ALL_PERMISSIONS,
  payment_admin: ALL_PERMISSIONS,
  evaluation_admin: [
    'candidates:read',
    'candidates:update',
    'evaluation:approve',
    'documents:verify',
    'notes:manage',
  ],
  operations_admin: [
    'candidates:read',
    'candidates:update',
    'interviews:manage',
    'notes:manage',
  ],
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const getPermissionsForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole] || [];
};

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
        role: normalizeRole(entry?.role) || 'operations_admin',
      }))
      .filter((entry) => entry.email && entry.password && ROLE_PERMISSIONS[entry.role]);
  } catch {
    return [];
  }
};

const parseSeparateRoleAdmins = () => {
  const roleEnvConfig = [
    {
      role: 'super_admin',
      emailKey: 'SUPER_ADMIN_EMAIL',
      passwordKey: 'SUPER_ADMIN_PASSWORD',
      nameKey: 'SUPER_ADMIN_NAME',
      defaultName: 'Super Admin',
    },
    {
      role: 'payment_admin',
      emailKey: 'PAYMENT_ADMIN_EMAIL',
      passwordKey: 'PAYMENT_ADMIN_PASSWORD',
      nameKey: 'PAYMENT_ADMIN_NAME',
      defaultName: 'Payments Admin',
    },
    {
      role: 'evaluation_admin',
      emailKey: 'EVALUATION_ADMIN_EMAIL',
      passwordKey: 'EVALUATION_ADMIN_PASSWORD',
      nameKey: 'EVALUATION_ADMIN_NAME',
      defaultName: 'Evaluation Admin',
    },
    {
      role: 'operations_admin',
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
    role: 'super_admin',
  }];
};

module.exports = {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  getConfiguredAdminUsers,
};
