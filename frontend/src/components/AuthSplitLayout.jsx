import Navbar from './Navbar';
import Footer from './Footer';

export default function AuthSplitLayout({ title, subtitle, children }) {
  return (
    <div className="nst-shell min-h-screen">
      <Navbar />
      <main className="flex flex-grow items-center justify-center px-6 pb-16 pt-28">
        <div className="grid w-full max-w-[1100px] grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div className="hidden lg:block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl shadow-xl">
              <img
                className="absolute inset-0 h-full w-full object-cover"
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"
                alt="Professional office"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h2 className="mb-2 text-3xl font-bold">Your global career starts here.</h2>
                <p className="text-sm text-blue-100">
                  Join an exclusive network of high-potential candidates pursuing structured international pathways.
                </p>
              </div>
            </div>
          </div>

          <section className="nst-card rounded-xl border border-slate-100 bg-white p-8">
            <h1 className="mb-1 text-3xl font-bold text-[#002147]">{title}</h1>
            {subtitle && <p className="mb-6 text-sm text-[#44474e]">{subtitle}</p>}
            {children}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
