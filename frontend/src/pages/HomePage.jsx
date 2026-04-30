import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const services = [
  {
    icon: 'analytics',
    title: 'Profile Evaluation & Alignment',
    description:
      'In-depth analysis of your professional trajectory to determine international pathway readiness and strategic fit.',
  },
  {
    icon: 'badge',
    title: 'Career Profile Development',
    description:
      'Editorial-grade optimization of your professional narrative for high-value international opportunities.',
  },
  {
    icon: 'map',
    title: 'Opportunity Mapping',
    description:
      'Precision matching with selective pathways across our partner network and destination regions.',
  },
  {
    icon: 'description',
    title: 'Documentation & Verification Support',
    description:
      'Structured coordination of credentials and evidence so your submission is complete and review-ready.',
  },
  {
    icon: 'account_tree',
    title: 'Process Coordination',
    description:
      'A dedicated pathway manager oversees each milestone from assessment through progression stages.',
  },
];

const regions = [
  'United States',
  'Germany',
  'Poland',
  'Austria',
  'Switzerland',
  'United Kingdom Upcoming',
  'Spain Upcoming',
  'Italy Upcoming',
];

export default function HomePage() {
  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden py-20 lg:py-24">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-6 lg:grid-cols-2">
            <div>
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-[#002147] lg:text-5xl">
                NextStep Talent - Building Global Career Pathways
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-[#44474e]">
                Structured pathways for individuals seeking international career opportunities through profile
                evaluation, candidate alignment, and readiness.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/evaluation-program"
                  className="rounded-lg bg-[#002147] px-8 py-4 text-sm font-semibold !text-white transition hover:opacity-90 hover:shadow-lg"
                >
                  Explore Current Opportunities
                </Link>
                <Link
                  to="/eligibility-check"
                    className="rounded-lg border border-[#002147] px-8 py-4 text-sm font-semibold text-[#002147] transition hover:bg-slate-50"
                >
                  Check Your Eligibility
                </Link>
              </div>
            </div>
            <div className="relative h-[500px] overflow-hidden rounded-2xl shadow-2xl">
              <img
                className="h-full w-full object-cover"
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80"
                alt="Global architecture"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#002147]/30 to-transparent" />
            </div>
          </div>
        </section>

        <section className="bg-[#f4f3f7] py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-[#3a5f94]">
              Elite Consultancy
            </span>
            <h2 className="mb-4 text-3xl font-bold text-[#002147]">Who We Are</h2>
            <p className="max-w-3xl text-lg leading-relaxed text-[#44474e]">
              NextStep Talent operates on a foundation of selective excellence. We are a structured international
              pathway platform focused on evaluation, readiness, and high-quality progression support.
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <h2 className="mb-12 text-center text-3xl font-bold text-[#002147]">Our Curated Services</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {services.map((service, idx) => (
                <div
                  key={service.title}
                  className={`nst-card rounded-xl border border-slate-100 p-6 ${idx === 3 ? 'md:col-span-2' : ''}`}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#002147]/5 text-[#002147]">
                    <span className="material-symbols-outlined">{service.icon}</span>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-[#002147]">{service.title}</h3>
                  <p className="text-sm leading-relaxed text-[#44474e]">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-white py-20">
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="mb-8 text-3xl font-bold text-[#002147]">Global Reach</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {regions.map((region) => (
                <div
                  key={region}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-[#f4f3f7] px-5 py-2.5 text-sm font-semibold text-[#3a5f94]"
                >
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {region}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="relative overflow-hidden rounded-2xl bg-[#002147] p-10 text-white md:p-14">
              <h3 className="mb-4 text-3xl font-bold">Selective Nature</h3>
              <p className="mb-8 max-w-2xl text-base leading-relaxed text-blue-100">
                Due to the structured and selective nature of our process, only a limited number of candidates are
                onboarded for each cycle.
              </p>
              <Link
                to="/eligibility-check"
                className="inline-flex items-center gap-2 rounded-lg bg-black px-8 py-3 text-sm font-semibold text-white"
              >
                Check Your Eligibility
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
