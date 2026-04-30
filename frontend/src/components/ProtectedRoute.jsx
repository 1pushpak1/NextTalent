import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireEmailVerified = false,
  requirePhoneVerified = false,
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const next = encodeURIComponent(location.pathname + location.search);

  if (!isAuthenticated) {
    if (requireAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/candidate-dashboard" replace />;
  if (requireEmailVerified && !user?.emailVerified) {
    return <Navigate to={`/verify-email?next=${next}`} replace />;
  }
  if (requirePhoneVerified && !user?.phoneVerified) {
    return <Navigate to={`/verify-phone?next=${next}`} replace />;
  }
  return children;
}
