import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const { logout } = useAuth();
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
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

        <main className="min-h-screen overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
