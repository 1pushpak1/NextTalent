import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { adminMainNav, adminPaymentNav } from './adminNav';
import { useAuth } from '../../context/AuthContext';
import usePermissions from '../../hooks/usePermissions';
import { fetchAdminDashboardSummary } from '../../api/adminApi';
import { getAdminDisplayName } from '../../utils/adminDisplay';

export default function AdminSidebar({ paymentsOpen, setPaymentsOpen, mobileOpen, setMobileOpen, onLogout }) {
  const location = useLocation();
  const { user } = useAuth();
  const { can, role } = usePermissions();
  const [summaryCards, setSummaryCards] = useState({
    profilesPendingReview: 0,
    documentsPendingVerification: 0,
    paymentsPendingVerification: 0,
    paymentsPendingVerificationInitial: 0,
    paymentsPendingVerificationProgram: 0,
    paymentsPendingVerificationFinal: 0,
    paymentsPendingInstructionMail: 0,
    hiringPendingAssignment: 0,
    interviewsPendingScheduled: 0,
  });
  const inPayments = location.pathname.startsWith('/admin/payments');
  const canAccessEntry = (entry) => {
    const requiredRoles = Array.isArray(entry?.requiredRoles) ? entry.requiredRoles : [];
    const requiredPermission = entry?.requiredPermission || '';
    if (String(role || '') === 'evaluation_admin' && entry?.to === '/admin/hiring') return false;
    if (requiredRoles.length && !requiredRoles.includes(String(role || ''))) return false;
    if (requiredPermission && !can(requiredPermission)) return false;
    return true;
  };
  const visibleMainNav = adminMainNav.filter(canAccessEntry);
  const visiblePaymentNav = adminPaymentNav.filter(canAccessEntry);
  const sidebarBubbles = useMemo(
    () => ({
      '/admin/candidates': Number(summaryCards.paymentsPendingInstructionMail || 0),
      '/admin/evaluation': Number(summaryCards.profilesPendingReview || 0),
      '/admin/document-verification': Number(summaryCards.documentsPendingVerification || 0),
      '/admin/hiring': Number(summaryCards.hiringPendingAssignment || 0),
      '/admin/selection': Number(summaryCards.interviewsPendingScheduled || 0),
      '/admin/payments': Number(summaryCards.paymentsPendingVerification || 0) + Number(summaryCards.paymentsPendingInstructionMail || 0),
      '/admin/payments/initial': Number(summaryCards.paymentsPendingVerificationInitial || 0),
      '/admin/payments/program': Number(summaryCards.paymentsPendingVerificationProgram || 0) + Number(summaryCards.paymentsPendingInstructionMail || 0),
      '/admin/payments/final': Number(summaryCards.paymentsPendingVerificationFinal || 0) + Number(summaryCards.paymentsPendingInstructionMail || 0),
    }),
    [summaryCards],
  );

  useEffect(() => {
    let mounted = true;
    let intervalId = null;
    const loadSummary = async () => {
      try {
        const { data } = await fetchAdminDashboardSummary();
        if (!mounted) return;
        setSummaryCards((prev) => ({ ...prev, ...(data?.cards || {}) }));
      } catch {
        if (!mounted) return;
      }
    };

    loadSummary();
    intervalId = window.setInterval(loadSummary, 15000);
    return () => {
      mounted = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

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
        className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col bg-[linear-gradient(180deg,#050505,#0b0b0c)] text-slate-200 transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[rgba(200,169,107,0.24)] px-5 py-5">
          {/* <p className="text-xs uppercase tracking-[0.24em] text-[#c8a96b]">Control Center</p> */}
          <h1 className="mt-2 text-xl font-bold text-white">Admin Console</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#c8a96b]">Admin</p>
          <p className="text-sm font-semibold text-[#f7f3ea]">{getAdminDisplayName(user?.adminRole, 'Admin')}</p>
          {/* <p className="text-xs tracking-wide text-[#bdbdc3]">Review-first workflow and audit trail</p> */}
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
          <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
            {visibleMainNav.map((item) => (
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
                <span className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {sidebarBubbles[item.to] > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                      {sidebarBubbles[item.to]}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            ))}

            {visiblePaymentNav.length > 0 && (
              <>
                <p className="mb-2 mt-4 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f9fa7]">Payments</p>
                <button
                  type="button"
                  onClick={() => setPaymentsOpen((v) => !v)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    inPayments ? 'bg-[#c8a96b] text-black' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>Payments</span>
                    {sidebarBubbles['/admin/payments'] > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                        {sidebarBubbles['/admin/payments']}
                      </span>
                    ) : null}
                  </span>
                  <span className="material-symbols-outlined text-base">{paymentsOpen ? 'expand_less' : 'expand_more'}</span>
                </button>

                {paymentsOpen && (
                  <div className="mt-1 space-y-1 pl-3">
                    {visiblePaymentNav.map((item) => (
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
                        <span className="flex items-center justify-between gap-2">
                          <span>{item.label}</span>
                          {sidebarBubbles[item.to] > 0 ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                              {sidebarBubbles[item.to]}
                            </span>
                          ) : null}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            )}
          </nav>

          <div className="shrink-0 pt-4">
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
