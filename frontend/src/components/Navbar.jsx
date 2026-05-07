import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const defaultLinks = [
  { href: '/', label: 'Home' },
  { href: '/evaluation-program', label: 'Evaluation Program' },
  { href: '/eligibility-check', label: 'Eligibility Check' },
];

export default function Navbar({ navigationLinks = defaultLinks }) {
  const { isAuthenticated, logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [firstName, setFirstName] = useState('');
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = firstName || user?.name?.trim()?.split(/\s+/)?.[0] || user?.email?.split('@')?.[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/candidate-dashboard';
  const isHome = location.pathname === '/';
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role === 'admin') return undefined;

    const localFirstName = user?.profile?.personalDetails?.firstName?.trim?.();
    if (localFirstName) {
      setFirstName(localFirstName);
      return undefined;
    }

    let ignore = false;
    api
      .get('/dashboard/me')
      .then(({ data }) => {
        if (ignore) return;
        const nextFirstName = data?.profile?.personalDetails?.firstName?.trim?.() || '';
        if (nextFirstName) setFirstName(nextFirstName);
      })
      .catch(() => {
        if (!ignore) setFirstName('');
      });

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, user?.profile?.personalDetails?.firstName, user?.role]);

  useEffect(() => {
    if (!open) return undefined;

    const onClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  useEffect(() => {
    setMobileOpen(false);
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    setMobileOpen(false);
    navigate('/', { replace: true });
  };

  const resolveHref = (href) => {
    if (!href.startsWith('#')) return href;
    return isHome ? href : `/${href}`;
  };

  const headerClass = isAdminRoute
    ? 'border-slate-200/80 bg-white/96 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.25)] backdrop-blur-xl'
    : scrolled
      ? 'border-[rgba(200,169,107,0.2)] bg-[rgba(7,7,8,0.82)] shadow-[0_20px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl'
      : 'border-transparent bg-transparent';

  const navLinkClass = isAdminRoute
    ? 'text-sm font-medium tracking-tight text-slate-600 transition hover:text-[#1f1f23]'
    : 'nst-nav-link text-[0.76rem] font-semibold uppercase tracking-[0.24em] text-[#c8a96b]';

  return (
    <header className={`fixed top-0 z-50 w-full border-b transition-all duration-300 ${headerClass}`}>
      <div className="mx-auto flex h-[5.5rem] w-full max-w-[1240px] items-center justify-between px-6 md:px-8">
        <Link to="/" className="flex items-center">
          <img
            src="/logo.png"
            alt="NextStep Talent logo"
            className="nst-logo-image h-14 w-auto object-contain md:h-16"
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navigationLinks.map((item) => (
            <Link key={item.label} className={navLinkClass} to={resolveHref(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className={`flex items-center gap-2 rounded-full border px-2 py-1.5 text-left transition ${
                  isHome || !isAdminRoute
                    ? 'border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                onClick={() => setOpen((value) => !value)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c8a96b] text-xs font-bold text-[#111]">
                  {initials}
                </span>
                <span className={`hidden max-w-[140px] truncate text-sm font-semibold md:block ${isHome || !isAdminRoute ? 'text-white' : 'text-[#111827]'}`}>
                  {displayName}
                </span>
                <span className={`material-symbols-outlined text-base ${isHome || !isAdminRoute ? 'text-[#d2c29f]' : 'text-slate-500'}`}>
                  expand_more
                </span>
              </button>

              {open && (
                <div className="absolute right-0 mt-3 w-64 rounded-[1.25rem] border border-[rgba(200,169,107,0.2)] bg-[#121214] p-2 text-white shadow-2xl">
                  <div className="mb-2 flex items-center gap-3 rounded-[1rem] bg-[rgba(255,255,255,0.04)] p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c8a96b] text-xs font-bold text-[#111]">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      <p className="truncate text-xs text-slate-400">{user?.email || ''}</p>
                    </div>
                  </div>

                  <Link
                    to={dashboardPath}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-[rgba(255,255,255,0.08)]"
                    onClick={() => setOpen(false)}
                  >
                    <span className="material-symbols-outlined text-base">dashboard</span>
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    className="mt-1 flex w-full items-center gap-2 rounded-xl border border-[rgba(248,113,113,0.65)] px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-[rgba(239,68,68,0.1)]"
                    onClick={handleLogout}
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className={navLinkClass} to="/login">
                Login
              </Link>
              <Link to="/eligibility-check" className={isHome || !isAdminRoute ? 'nst-outline-button' : 'nst-inline-cta'}>
                Check Eligibility
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border lg:hidden ${
            isHome || !isAdminRoute
              ? 'border-[rgba(200,169,107,0.24)] bg-[rgba(255,255,255,0.04)] text-white'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {mobileOpen && (
        <div className={`border-t px-6 py-5 lg:hidden ${isHome || !isAdminRoute ? 'border-[rgba(200,169,107,0.16)] bg-[#0a0a0b]/96' : 'border-slate-200 bg-white'}`}>
          <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
            {navigationLinks.map((item) => (
              <Link
                key={item.label}
                className={navLinkClass}
                to={resolveHref(item.href)}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link className={navLinkClass} to="/login" onClick={() => setMobileOpen(false)}>
              Login
            </Link>
            <Link to="/eligibility-check" className={isHome || !isAdminRoute ? 'nst-outline-button mt-2 text-center' : 'nst-inline-cta mt-2 text-center'}>
              Check Eligibility
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
