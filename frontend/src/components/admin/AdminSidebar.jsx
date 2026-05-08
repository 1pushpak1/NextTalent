import { NavLink, useLocation } from 'react-router-dom';
import { adminMainNav, adminPaymentNav } from './adminNav';

export default function AdminSidebar({ paymentsOpen, setPaymentsOpen, mobileOpen, setMobileOpen, onLogout }) {
  const location = useLocation();
  const inPayments = location.pathname.startsWith('/admin/payments');

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar backdrop"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 bg-[linear-gradient(180deg,#050505,#0b0b0c)] text-slate-200 transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[rgba(200,169,107,0.24)] px-5 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[#c8a96b]">Control Center</p>
          <h1 className="mt-2 text-xl font-bold text-white">Admin Console</h1>
          {/* <p className="text-xs tracking-wide text-[#bdbdc3]">Review-first workflow and audit trail</p> */}
        </div>

        <div className="flex h-[calc(100vh-92px)] flex-col px-3 py-4">
          <nav className="flex-1 overflow-y-auto pr-1">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f9fa7]">Pipeline</p>
            {adminMainNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `mb-1 block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-[#c8a96b] text-black shadow-sm' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <p className="mb-2 mt-4 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f9fa7]">Payments</p>
            <button
              type="button"
              onClick={() => setPaymentsOpen((v) => !v)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                inPayments ? 'bg-[#c8a96b] text-black' : 'text-slate-300 hover:bg-white/5 hover:text-white'
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
                      `block rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive ? 'bg-[#c8a96b]/20 text-[#f7f3ea]' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </nav>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onLogout?.();
              }}
              className="w-full rounded-xl border border-[rgba(200,169,107,0.45)] px-4 py-2.5 text-sm font-semibold text-[#f7f3ea] transition hover:bg-[rgba(200,169,107,0.14)]"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
