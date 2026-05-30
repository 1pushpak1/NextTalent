const { ADMIN_ROLES, normalizeAdminRole } = require('../constants/workflow');
const { getConfiguredAdminUsers } = require('./adminPermissions');

const unique = (values = []) => [...new Set(values.filter(Boolean).map((v) => String(v).toLowerCase().trim()))];
const envEmail = (key) => String(process.env[key] || '').toLowerCase().trim();

const emailsByRole = (role, envKeys = []) => {
  const normalized = normalizeAdminRole(role);
  const configured = getConfiguredAdminUsers()
    .filter((admin) => normalizeAdminRole(admin.role) === normalized)
    .map((admin) => admin.email);
  const fromEnv = envKeys.map((key) => envEmail(key)).filter(Boolean);
  return unique([...configured, ...fromEnv]);
};

const getPaymentsAdminEmails = () => {
  return emailsByRole(ADMIN_ROLES.SUPER_ADMIN, ['SUPER_ADMIN_EMAIL', 'ADMIN_EMAIL']);
};

const getEvaluationAdminEmails = () => {
  const evaluationAdmins = emailsByRole(ADMIN_ROLES.EVALUATION_ADMIN, ['EVALUATION_ADMIN_EMAIL']);
  const superAdmins = emailsByRole(ADMIN_ROLES.SUPER_ADMIN, ['SUPER_ADMIN_EMAIL', 'ADMIN_EMAIL']);
  return unique([...evaluationAdmins, ...superAdmins]);
};

const getOperationsAdminEmails = () => {
  const operationsAdmins = emailsByRole(ADMIN_ROLES.OPERATIONS_ADMIN, ['OPERATIONS_ADMIN_EMAIL']);
  const superAdmins = emailsByRole(ADMIN_ROLES.SUPER_ADMIN, ['SUPER_ADMIN_EMAIL', 'ADMIN_EMAIL']);
  return unique([...operationsAdmins, ...superAdmins]);
};

const getSuperAdminEmails = () => emailsByRole(ADMIN_ROLES.SUPER_ADMIN, ['SUPER_ADMIN_EMAIL', 'ADMIN_EMAIL']);

module.exports = {
  getPaymentsAdminEmails,
  getEvaluationAdminEmails,
  getOperationsAdminEmails,
  getSuperAdminEmails,
};
