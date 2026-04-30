import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const sideItems = [
  { name: 'Profile', icon: 'account_circle', to: '/profile-submission' },
  { name: 'Dashboard', icon: 'dashboard', to: '/candidate-dashboard' },
  { name: 'Programs', icon: 'work_history', to: '/interviews' },
  { name: 'Payment History', icon: 'receipt_long', to: '/payment-history' },
  { name: 'Settings', icon: 'settings', to: '/candidate-dashboard' },
];

export default function CandidatePortalSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(
    user?.profile?.personalDetails?.firstName || user?.name?.split?.(' ')?.[0] || (user?.email?.split?.('@')?.[0] || '')
  );

  useEffect(() => {
    if (!firstName) {
      api
        .get('/dashboard/me')
        .then(({ data }) => {
          const fn = data?.candidate?.profile?.personalDetails?.firstName;
          if (fn) setFirstName(fn);
        })
        .catch(() => {});
    }
  }, [firstName]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-20 z-20 hidden h-[calc(100vh-80px)] w-64 flex-col gap-2 border-r border-slate-200 bg-[#f8f9fa] p-4 lg:flex">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-200 px-3 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#002147] text-sm font-bold text-white">
          {(firstName ? firstName.slice(0, 2) : user?.name?.slice(0, 2) || 'CA').toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#002147]">Candidate Portal</p>
          <p className="text-xs text-slate-500">Elite Pathway</p>
        </div>
      </div>
      <nav className="space-y-1">
        {sideItems.map((item) => {
          const isActive = item.name !== 'Settings' && location.pathname === item.to;
          return (
            <Link
              key={item.name}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-white text-[#002147] ring-1 ring-slate-200'
                  : 'text-slate-500 hover:bg-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-600 bg-transparent px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
          onClick={handleLogout}
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
