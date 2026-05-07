import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc,#eef2f7)]">
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
          className="fixed left-4 top-4 z-30 rounded-md border border-slate-200 bg-white p-2 shadow-sm lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin sidebar"
        >
          <span className="material-symbols-outlined text-base">menu</span>
        </button>

        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">NextStep Talent Admin</p>
              <h1 className="text-lg font-semibold text-slate-900">Operations Workspace</h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
              <div className="h-10 w-10 rounded-full bg-slate-900/90 text-center text-sm font-bold leading-10 text-white">
                {String(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{user?.name || 'Admin'}</p>
                <p className="text-xs text-slate-500">{String(user?.adminRole || '').replaceAll('_', ' ') || 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-screen overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
