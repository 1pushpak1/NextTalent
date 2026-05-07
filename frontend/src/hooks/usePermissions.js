import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export default function usePermissions() {
  const { user } = useAuth();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return useMemo(() => ({
    role: user?.adminRole || '',
    permissions,
    can: (permission) => permissions.includes(permission),
  }), [user?.adminRole, permissions]);
}
