import Navbar from './Navbar';
import Footer from './Footer';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function InfoPageLayout({ title, subtitle, children, leftAligned = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [returnTo, setReturnTo] = useState(null);

  useEffect(() => {
    // 1) Prefer explicit state passed via Link (location.state.from)
    if (location?.state?.from) {
      setReturnTo(location.state.from);
      return;
    }

    // 2) Fallback to same-origin document.referrer when available
    try {
      const ref = document.referrer || '';
      const origin = window.location.origin || '';
      if (ref && origin && ref.startsWith(origin)) {
        const path = ref.slice(origin.length) || '/';
        setReturnTo(path);
        return;
      }
    } catch (err) {
      // ignore
    }

    // If no reliable referrer, leave returnTo as null (we will hide the button)
  }, [location]);

  const handleGoBack = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    // fallback to history back if possible
    navigate(-1);
  };

  return (
    <div className="nst-shell min-h-screen">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-[1000px] px-6">
          <section className={`nst-card rounded-xl p-8 ${leftAligned ? 'text-left' : 'text-center'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="nst-display text-5xl font-bold tracking-tight text-[#f7f3ea]">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-[#bdbdc3]">{subtitle}</p>}
              </div>
              {returnTo ? (
                <div className="ml-4 hidden sm:block">
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#c8a96b] bg-[#c8a96b] px-4 py-2 text-sm font-semibold text-black hover:brightness-95"
                  >
                    Go back
                  </button>
                </div>
              ) : null}
            </div>
            <div className={`mt-6 space-y-4 text-sm leading-relaxed text-[#c7c7cd] ${leftAligned ? 'max-w-none' : 'mx-auto max-w-2xl'}`}>{children}</div>
            {/* Show a smaller back button on mobile at the bottom if a return destination is known */}
            {returnTo ? (
              <div className="mt-6 block sm:hidden">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="w-full rounded-lg border border-[#c8a96b] bg-[#c8a96b] px-4 py-2 text-sm font-semibold text-black hover:brightness-95"
                >
                  Go back
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
