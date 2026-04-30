import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../Button';
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
      />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-200 p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin sidebar"
            >
              <span className="material-symbols-outlined text-base">menu</span>
            </button>
            <p className="text-sm font-semibold text-slate-900">Admin Workspace</p>
          </div>
          <Button variant="secondary" onClick={logout}>Logout</Button>
        </header>

        <main className="h-[calc(100vh-57px)] overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
