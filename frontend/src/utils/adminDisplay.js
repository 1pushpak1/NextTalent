const ADMIN_DISPLAY_NAMES = {
  super_admin: 'Nivedita Gowda',
  evaluation_admin: 'Deepak Tyagi',
  operations_admin: 'Arna Bose',
};

const ADMIN_POSSESSIVE_NAMES = {
  super_admin: "Nivedita's",
  evaluation_admin: "Deepak's",
  operations_admin: "Arna's",
};

const ADMIN_ROLE_LABELS = {
  super_admin: 'Nivedita Gowda',
  evaluation_admin: 'Deepak Tyagi',
  operations_admin: 'Arna Bose',
};

export const getAdminDisplayName = (role = '', fallback = 'Admin') =>
  ADMIN_DISPLAY_NAMES[String(role || '').trim().toLowerCase()] || fallback;

export const getAdminPossessiveName = (role = '', fallback = 'Admin') =>
  ADMIN_POSSESSIVE_NAMES[String(role || '').trim().toLowerCase()] || fallback;

export const getAdminRoleLabel = (role = '', fallback = 'Admin') =>
  ADMIN_ROLE_LABELS[String(role || '').trim().toLowerCase()] || fallback;
