import Navbar from './Navbar';
import Footer from './Footer';

export default function InfoPageLayout({ title, subtitle, children, leftAligned = false }) {
  return (
    <div className="nst-shell min-h-screen">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-[1000px] px-6">
          <section className={`nst-card rounded-xl p-8 ${leftAligned ? 'text-left' : 'text-center'}`}>
            <h1 className="nst-display text-5xl font-bold tracking-tight text-[#f7f3ea]">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-[#bdbdc3]">{subtitle}</p>}
            <div className={`mt-6 space-y-4 text-sm leading-relaxed text-[#c7c7cd] ${leftAligned ? 'max-w-none' : 'mx-auto max-w-2xl'}`}>{children}</div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
