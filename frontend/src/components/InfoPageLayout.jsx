import Navbar from './Navbar';
import Footer from './Footer';

export default function InfoPageLayout({ title, subtitle, children }) {
  return (
    <div className="nst-shell min-h-screen">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto max-w-[1000px] px-6">
          <section className="nst-card rounded-xl p-8">
            <h1 className="text-4xl font-bold tracking-tight text-[#002147]">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#44474e]">{children}</div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
