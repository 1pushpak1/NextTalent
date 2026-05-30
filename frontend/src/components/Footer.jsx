import { Link, useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const hiddenFooterRoutes = new Set(['/candidate-dashboard', '/profile-submission', '/payment-history']);
  if (hiddenFooterRoutes.has(location.pathname)) return null;
  const isHome = location.pathname === '/';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const compactFooterRoutes = new Set(['/payment-history', '/candidate-dashboard', '/profile-submission']);
  const isCompactFooter = compactFooterRoutes.has(location.pathname);

  return (
    <footer className={`mt-auto w-full border-t ${isCompactFooter ? 'py-7' : 'py-12'} ${isHome || !isAdminRoute ? 'border-[rgba(200,169,107,0.14)] bg-[#050505] text-white' : 'border-slate-100 bg-white text-[#101218]'}`}>
      <div className="mx-auto max-w-[1240px] px-6 md:px-8">
        <div className="flex justify-center">
          <Link to="/" className="inline-flex">
            <img src="/logo.png" alt="NextStep Talent logo" className="nst-logo-image h-[5.25rem] w-auto object-contain md:h-[6.75rem]" />
          </Link>
        </div>

        <div className="mt-10 flex flex-col items-center gap-8 text-center">
          <div>
              <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm ${isHome || !isAdminRoute ? 'text-[#bdbdc3]' : 'text-slate-500'}`}>
              <Link className="transition hover:text-[#c8a96b]" to="/privacy-policy" state={{ from: location.pathname }}>Privacy Policy</Link>
              <span className="opacity-50">|</span>
              <Link className="transition hover:text-[#c8a96b]" to="/payment-refund-policy" state={{ from: location.pathname }}>Payment & Refund Policy</Link>
              <span className="opacity-50">|</span>
              <Link className="transition hover:text-[#c8a96b]" to="/terms-of-service" state={{ from: location.pathname }}>Terms and Conditions</Link>
            </div>
          </div>
        </div>

        <p className={`mt-12 text-center text-xs uppercase tracking-[0.22em] ${isHome || !isAdminRoute ? 'text-[#85858e]' : 'text-slate-400'}`}>
          © 2026 NextStep Talent. All rights reserved.
          <br />
          Developed by{' '}
          <a
            href="http://ravviolabs.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline-offset-2 hover:underline"
          >
            Ravviolabs Technologies
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
