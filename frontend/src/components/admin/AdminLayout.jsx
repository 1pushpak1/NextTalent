import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import usePermissions from '../../hooks/usePermissions';

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const { pathname, search } = location;
  const navigate = useNavigate();
  const { can, role } = usePermissions();
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainContentRef = useRef(null);

  const canAccessAdminPath = useCallback((path) => {
    if (path.startsWith('/admin/payments')) return can('payments:verify');
    if (path.startsWith('/admin/evaluation')) return can('evaluation:approve');
    if (path.startsWith('/admin/document-verification')) return can('documents:verify');
    if (path.startsWith('/admin/selection')) return ['super_admin', 'payments_admin'].includes(String(role || ''));
    if (path.startsWith('/admin/hiring')) return can('candidates:update');
    if (path.startsWith('/admin/operations/')) return can('candidates:update');
    if (path.startsWith('/admin/candidates') || path.startsWith('/admin/candidate')) return can('candidates:read');
    if (path.startsWith('/admin/dashboard') || path.startsWith('/admin/testimonials')) return can('candidates:read');
    return true;
  }, [can, role]);

  // Auto-scroll main content to top when route changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname]);

  useEffect(() => {
    if (!canAccessAdminPath(pathname)) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [pathname, navigate, canAccessAdminPath]);

  return (
    <div className="nst-shell nst-admin-shell min-h-screen">
      <AdminSidebar
        paymentsOpen={paymentsOpen}
        setPaymentsOpen={setPaymentsOpen}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={logout}
      />

      <div className="lg:pl-72">
        <button
          type="button"
          className="fixed left-4 top-4 z-30 rounded-md border border-[rgba(200,169,107,0.35)] bg-[rgba(255,255,255,0.08)] p-2 text-[#f7f3ea] shadow-sm lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin sidebar"
        >
          <span className="material-symbols-outlined text-base">menu</span>
        </button>

        <header className="sticky top-0 z-20 border-b border-[rgba(200,169,107,0.24)] bg-[rgba(8,8,9,0.9)] px-4 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#c8a96b]">NextStep Talent Admin</p>
              <h1 className="text-lg font-semibold text-[#f7f3ea]">Operations Workspace</h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[rgba(200,169,107,0.24)] bg-[rgba(255,255,255,0.04)] px-4 py-2">
              <div className="h-10 w-10 rounded-full bg-[#c8a96b]/90 text-center text-sm font-bold leading-10 text-black">
                {String(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f7f3ea]">{user?.name || 'Admin'}</p>
                <p className="text-xs text-[#bdbdc3]">{String(user?.adminRole || '').replaceAll('_', ' ') || 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-screen overflow-y-auto p-4" ref={mainContentRef}>
          <div key={`${pathname}${search}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
