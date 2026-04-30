import { Link, useLocation } from 'react-router-dom';

const items = [
  { name: 'Dashboard', to: '/candidate-dashboard' },
  { name: 'Profile', to: '/profile-submission' },
  { name: 'Payments', to: '/initial-payment' },
  { name: 'Documents', to: '/documents' },
  { name: 'Interviews', to: '/interviews' },
  { name: 'Messages', to: '/email-sent' },
  { name: 'Settings', to: '/candidate-dashboard' },
];

export default function DashboardLayout({ children }) {
  const location = useLocation();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 md:grid-cols-[250px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {items.map((item) => (
          <Link
            key={item.name}
            to={item.to}
            className={`mb-1 block rounded-xl px-3 py-2 text-sm font-medium ${
              location.pathname === item.to ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </aside>
      <main>{children}</main>
    </div>
  );
}
