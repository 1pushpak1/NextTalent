import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const processCards = [
  {
    icon: 'school',
    title: 'Academic Review',
    body: 'Validation of educational credentials and relevance for destination-specific pathway requirements.',
  },
  {
    icon: 'work',
    title: 'Professional Merit',
    body: 'Evaluation of career progression, skills depth, and candidate alignment with opportunity criteria.',
  },
  {
    icon: 'translate',
    title: 'Linguistic Alignment',
    body: 'Assessment of language readiness and certification standards applicable to selected destinations.',
  },
];

const steps = [
  'Profile Assessment',
  'Eligibility Screening',
  'Gap Analysis',
  'Next Steps Roadmap',
];

export default function EvaluationProgramPage() {
  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-20">
        <section className="bg-white py-20">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-6 lg:grid-cols-2">
            <div>
              <span className="mb-6 inline-block rounded-full bg-blue-100 px-4 py-1.5 text-xs font-semibold text-[#2d476f]">
                International Career Pathway
              </span>
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-[#002147] lg:text-5xl">
                International Career Eligibility & Evaluation Program
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-[#44474e]">
                Begin your application for global career opportunities across Europe, United States, and other
                international markets.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/eligibility-check"
                  className="rounded-lg bg-[#002147] px-8 py-4 text-sm font-semibold !text-white transition hover:opacity-90 hover:shadow-lg"
                >
                  Check Your Eligibility
                </Link>
                <a className="rounded-lg border border-[#002147] px-8 py-4 text-sm font-semibold text-[#002147]">
                  Learn More
                </a>
              </div>
            </div>
            <div className="relative h-[520px] overflow-hidden rounded-2xl shadow-xl">
              <img
                className="h-full w-full object-cover"
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
                alt="Evaluation Program"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#002147]/30 to-transparent" />
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-[#002147]">About the Evaluation Process</h2>
              <p className="mx-auto max-w-3xl text-base text-[#44474e]">
                A comprehensive assessment designed to determine candidate readiness and pathway alignment.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {processCards.map((item) => (
                <div key={item.title} className="nst-card rounded-xl border border-slate-100 p-8">
                  <span className="material-symbols-outlined mb-4 text-4xl text-[#3a5f94]">{item.icon}</span>
                  <h3 className="mb-3 text-xl font-semibold text-[#002147]">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-[#44474e]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f4f3f7] py-20">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 lg:grid-cols-2">
            <div className="nst-card rounded-xl border-l-4 border-l-red-500 p-8">
              <h3 className="mb-4 text-2xl font-semibold text-[#002147]">Important Information</h3>
              <ul className="space-y-3 text-sm text-[#44474e]">
                <li>This is an evaluation process, not a job application</li>
                <li>This process does not promise employment or placement</li>
                <li>Progression is based on eligibility and external requirements</li>
                <li>Only shortlisted candidates move forward</li>
              </ul>
            </div>
            <div className="rounded-xl bg-[#002147] p-8 text-white">
              <h3 className="mb-3 text-2xl font-semibold">What This Step Includes</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {steps.map((step, idx) => (
                  <div key={step} className="rounded-lg border border-white/20 bg-white/10 p-4">
                    <p className="text-xs font-bold tracking-wider text-blue-100">0{idx + 1}</p>
                    <p className="mt-1 text-sm font-semibold">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[#002147]">Step 1: Check Your Eligibility</h2>
            <p className="mx-auto mb-8 max-w-2xl text-base text-[#44474e]">
              If you are seeking structured international pathway support and meet core qualification requirements, begin
              with the guided eligibility check.
            </p>
            <Link
              to="/eligibility-check"
              className="inline-flex items-center gap-2 rounded-lg bg-[#002147] px-8 py-4 text-sm font-semibold !text-white hover:opacity-90"
            >
              Check Your Eligibility
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
