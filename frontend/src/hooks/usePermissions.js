import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export default function usePermissions() {
  const { user } = useAuth();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isSuperAdmin = String(user?.adminRole || '').trim().toLowerCase() === 'super_admin';

  return useMemo(() => ({
    role: user?.adminRole || '',
    permissions,
    can: (permission) => isSuperAdmin || permissions.includes(permission),
  }), [user?.adminRole, permissions, isSuperAdmin]);
}
