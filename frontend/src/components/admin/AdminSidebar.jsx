import { NavLink, useLocation } from 'react-router-dom';
import { adminMainNav, adminPaymentNav } from './adminNav';

export default function AdminSidebar({ paymentsOpen, setPaymentsOpen, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const inPayments = location.pathname.startsWith('/admin/payments');

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar backdrop"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 bg-slate-950 text-slate-200 transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-800 px-5 py-5">
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-xs tracking-wide text-slate-400">NextStep Talent</p>
        </div>

        <nav className="h-[calc(100vh-92px)] overflow-y-auto px-3 py-4">
          {adminMainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `mb-1 block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setPaymentsOpen((v) => !v)}
            className={`mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              inPayments ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>Payments</span>
            <span className="material-symbols-outlined text-base">{paymentsOpen ? 'expand_less' : 'expand_more'}</span>
          </button>

          {paymentsOpen && (
            <div className="mt-1 space-y-1 pl-3">
              {adminPaymentNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-xs font-medium transition ${
                      isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
