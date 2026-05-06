import { Link, useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const compactFooterRoutes = new Set(['/payment-history', '/interviews', '/candidate-dashboard', '/profile-submission']);
  const isCompactFooter = compactFooterRoutes.has(location.pathname);
  const candidatePortalRoutes = [
    '/candidate-dashboard',
    '/profile-submission',
    '/payment-history',
    '/interviews',
    '/documents',
    '/declaration',
    '/onboarding',
    '/testimonial',
    '/initial-payment',
    '/payment/program-fee',
    '/payment/final-payment',
  ];
  const isCandidatePortalRoute = candidatePortalRoutes.some((route) => location.pathname.startsWith(route));

  return (
    <footer className={`mt-auto w-full border-t ${isCompactFooter ? 'py-7' : 'py-12'} ${isHome || !isAdminRoute ? 'border-[rgba(200,169,107,0.14)] bg-[#050505] text-white' : 'border-slate-100 bg-white text-[#101218]'}`}>
      <div className="mx-auto max-w-[1240px] px-6 md:px-8">
        <div className="flex justify-center">
          <Link to="/" className="inline-flex">
            <img src="/logo.jpeg" alt="NextStep Talent logo" className="nst-logo-image h-[4.5rem] w-auto object-contain md:h-[5.5rem]" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 text-center md:grid-cols-2">
          <div>
            <h4 className={`mb-4 text-xs font-semibold uppercase tracking-[0.24em] ${isHome || !isAdminRoute ? 'text-[#c8a96b]' : 'text-[#7a6d53]'}`}>
              Navigation
            </h4>
            <div className={`space-y-3 text-sm ${isHome || !isAdminRoute ? 'text-[#bdbdc3]' : 'text-slate-500'}`}>
              {isCandidatePortalRoute ? (
                <p><Link className="transition hover:text-[#c8a96b]" to="/candidate-dashboard">Candidate Portal</Link></p>
              ) : (
                <>
                  <p><Link className="transition hover:text-[#c8a96b]" to="/">Home</Link></p>
                  <p><Link className="transition hover:text-[#c8a96b]" to="/#who-we-are">Who We Are</Link></p>
                  <p><Link className="transition hover:text-[#c8a96b]" to="/#process">Process</Link></p>
                  <p><Link className="transition hover:text-[#c8a96b]" to="/#regions">Regions</Link></p>
                </>
              )}
            </div>
          </div>
          <div>
            <h4 className={`mb-4 text-xs font-semibold uppercase tracking-[0.24em] ${isHome || !isAdminRoute ? 'text-[#c8a96b]' : 'text-[#7a6d53]'}`}>
              Legal & Support
            </h4>
            <div className={`space-y-3 text-sm ${isHome || !isAdminRoute ? 'text-[#bdbdc3]' : 'text-slate-500'}`}>
              <p><Link className="transition hover:text-[#c8a96b]" to="/privacy-policy">Privacy Policy</Link></p>
              <p><Link className="transition hover:text-[#c8a96b]" to="/terms-of-service">Terms of Service</Link></p>
              <p><Link className="transition hover:text-[#c8a96b]" to="/cookie-policy">Cookie Policy</Link></p>
              <p><Link className="transition hover:text-[#c8a96b]" to="/support">Support</Link></p>
              <p><Link className="transition hover:text-[#c8a96b]" to="/contact">Contact</Link></p>
            </div>
          </div>
        </div>

        <p className={`mt-12 text-center text-xs uppercase tracking-[0.22em] ${isHome || !isAdminRoute ? 'text-[#85858e]' : 'text-slate-400'}`}>
          © 2026 NextStep Talent. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
