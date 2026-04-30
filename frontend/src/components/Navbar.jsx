import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const displayName = user?.name || user?.email?.split('@')?.[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/candidate-dashboard';

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <header className="fixed top-0 z-40 w-full border-b border-slate-200/60 bg-white/95 shadow-[0_4px_20px_-10px_rgba(0,33,71,0.08)] backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="text-xl font-black uppercase tracking-tighter text-[#002147]">
          NextStep
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link className="text-sm font-medium tracking-tight text-slate-600 transition-colors hover:text-[#002147]" to="/">
            Home
          </Link>
          <Link className="text-sm font-medium tracking-tight text-slate-600 transition-colors hover:text-[#002147]" to="/evaluation-program">
            Evaluation Program
          </Link>
          <Link className="text-sm font-medium tracking-tight text-slate-600 transition-colors hover:text-[#002147]" to="/eligibility-check">
            Eligibility Check
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-left transition hover:bg-slate-50"
                onClick={() => setOpen((v) => !v)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#002147] text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden max-w-[140px] truncate text-sm font-semibold text-[#002147] md:block">{displayName}</span>
                <span className="material-symbols-outlined text-base text-slate-500">expand_more</span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="mb-2 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#002147] text-xs font-bold text-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#002147]">{displayName}</p>
                      <p className="truncate text-xs text-slate-500">{user?.email || ''}</p>
                    </div>
                  </div>

                  <Link
                    to={dashboardPath}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    onClick={() => setOpen(false)}
                  >
                    <span className="material-symbols-outlined text-base">dashboard</span>
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
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
              <Link className="text-sm font-medium tracking-tight text-slate-600 transition-colors hover:text-[#002147]" to="/login">
                Login
              </Link>
              <Link to="/eligibility-check">
                <Button>Check Your Eligibility</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
