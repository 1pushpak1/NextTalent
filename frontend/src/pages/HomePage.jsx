import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ParticleField from '../components/home/ParticleField';
import Reveal from '../components/home/Reveal';
import WorldMapPanel from '../components/home/WorldMapPanel';

const processSteps = [
  {
    title: 'Profile Evaluation & Alignment',
    description:
      'Assessing candidate backgrounds against current international pathway requirements.',
  },
  {
    title: 'Career Profile Development',
    description:
      'Structuring and presenting profiles to meet global standards.',
  },
  {
    title: 'Opportunity Mapping',
    description:
      'Aligning candidates with relevant international pathways based on eligibility.',
  },
  {
    title: 'Documentation & Verification Support',
    description:
      'Coordinating document validation and readiness for external review.',
  },
  {
    title: 'Process Coordination',
    description:
      'Managing candidate progression through each stage of the pathway.',
  },
];

const navigationLinks = [
  { href: '/', label: 'Home' },
  { href: '/evaluation-program', label: 'Evaluation' },
];

export default function HomePage() {
  return (
    <div className="nst-shell nst-home-shell">
      <Navbar navigationLinks={navigationLinks} />
      <main className="bg-[#050505] text-white">
        <section id="hero" className="relative flex min-h-screen items-center overflow-hidden px-6 pt-28 pb-[2.25rem] md:px-10">
          <ParticleField className="absolute inset-0 h-full w-full opacity-100" />
          <ParticleField className="absolute inset-x-0 bottom-0 h-[42%] w-full opacity-100" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(200,169,107,0.14),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.06),transparent_45%),linear-gradient(180deg,rgba(5,5,5,0.25)_0%,#050505_86%)]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(5,5,5,0.96))]" />

          <div className="relative mx-auto flex w-full max-w-[1180px] justify-center">
            <Reveal className="mx-auto max-w-[860px] text-center">
              {/* Replace heading text with logo (same visual size) */}
              <img
                src="/logo.png"
                alt="NextStep Talent"
                className="mx-auto mt-4 h-[7.2rem] sm:h-[9.6rem] md:h-[13.6rem] w-auto object-contain"
              />
              <div className="mx-auto mt-8 h-px w-[4.5rem] bg-[linear-gradient(90deg,transparent,#c8a96b,transparent)]" />
              <p className="mx-auto mt-8 max-w-[760px] text-base leading-8 text-[#d2d2d6] sm:text-lg">
                Structured pathways for individuals seeking international career opportunities through profile
                evaluation, alignment, and readiness.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/evaluation-program" className="nst-outline-button min-w-[280px] text-center">
                  Explore Current Opportunities
                </Link>
                {/* <Link to="/eligibility-check" className="nst-ghost-button min-w-[240px] text-center">
                  Check Eligibility
                </Link> */}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="who-we-are" className="nst-home-section px-6 py-10 md:px-10 md:py-14">
          <div className="mx-auto max-w-[1180px]">
            <Reveal>
              <span className="nst-kicker">Who We Are</span>
              <h2 className="mt-6 nst-display max-w-[820px] text-[2.9rem] leading-[0.98] tracking-[-0.04em] text-white sm:text-[3.6rem] md:text-[4.55rem]">
                A global platform built on <span className="italic text-[#c8a96b]">experience</span> and precision.
              </h2>
              <div className="mt-10 space-y-7 text-[1.02rem] leading-8 text-[#cdced3]">
                <p>NextStep Talent is a United States-based global platform focused on building structured career pathways for individuals seeking opportunities beyond their home countries.</p>
                <p>Backed by a team with over 40+ years of collective experience in education, international programs, and global engagement, we bring deep industry insight and strong global networks to support candidates in navigating complex international career journeys.</p>
                <p>Our approach is process-driven, selective, and designed to ensure that every candidate is aligned, prepared, and positioned for the right international opportunities.</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="process" className="nst-home-section relative overflow-hidden px-6 py-20 md:px-10 md:py-28">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(200,169,107,0.35),transparent)]" />
          <div className="mx-auto max-w-[1180px]">
            <Reveal>
              <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:items-center">
                <div className="order-1 md:order-1">
                  <span className="nst-kicker">What We Do</span>
                  <h2 className="mt-6 nst-display text-[2.9rem] leading-[1] tracking-[-0.04em] text-white sm:text-[3.6rem] md:text-[4.55rem]">
                    A structured process, at every stage.
                  </h2>
                  <p className="mt-4 max-w-[700px] text-base leading-8 text-[#cfd0d4] sm:text-lg">
                    We offer a structured and selective process designed to support candidates at every stage of their international career journey:
                  </p>
                </div>
                <div className="order-2 mt-2 flex justify-start md:justify-end">
                    <img
                      src="/image2.png"
                      alt="Illustration showing a structured process and workflow"
                      loading="lazy"
                      className="w-[220px] md:w-[280px] rounded-lg border border-[rgba(200,169,107,0.06)] shadow-lg object-cover"
                    />
                </div>
              </div>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 border-t border-[rgba(200,169,107,0.18)] md:grid-cols-2 xl:grid-cols-5">
              {processSteps.map((step, index) => (
                <Reveal
                  key={step.title}
                  delay={index * 70}
                  className="group nst-hover-gold relative border-b border-[rgba(200,169,107,0.14)] px-6 py-8 transition duration-500 md:border-r xl:min-h-[360px]"
                >
                  <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-[#c8a96b] transition duration-500 group-hover:scale-x-100" />
                  <div className="text-[0.72rem] uppercase tracking-[0.35em] text-[#8f8469]">{String(index + 1).padStart(2, '0')}</div>
                  <h3 className="mt-10 nst-display text-[2rem] leading-[1.08] text-white">{step.title}</h3>
                  <p className="mt-6 max-w-[240px] text-sm leading-7 text-[#b8b9bf]">{step.description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="regions" className="nst-home-section px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-[1180px]">
            <Reveal className="mb-12 max-w-[760px]">
              <span className="nst-kicker">Global Focus</span>
              <h2 className="mt-6 nst-display text-[2.9rem] leading-[1] tracking-[-0.04em] text-white sm:text-[3.6rem] md:text-[4.55rem]">
                Regions We Work With
              </h2>
              <p className="mt-8 max-w-[680px] text-base leading-8 text-[#cfd0d4] sm:text-lg">
                Our focus regions continue to expand based on global demand and opportunity alignment.
              </p>
            </Reveal>

            <WorldMapPanel />
          </div>
        </section>

        <section id="notice" className="nst-home-section px-6 pb-8 pt-2 md:px-10 md:pb-12 md:pt-3">
          <Reveal className="mx-auto max-w-[1180px]">
            <div className="px-6 py-6 md:px-10 md:py-8">
              <div className="mx-auto max-w-[900px]">
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-[#c8a96b] bg-gradient-to-r from-[#071018] via-transparent to-transparent p-6 shadow-xl"
                >
                  <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#c8a96b] text-black text-2xl font-semibold">
                      <span className="material-symbols-outlined">verified</span>
                    </div>
                    <div className="text-center md:text-left">
                      {/* <p className="text-xs font-semibold uppercase tracking-wider text-[#f4dfb2]">Selective Intake</p> */}
                      <h3 className="mt-2 text-2xl md:text-3xl font-extrabold text-white leading-tight">
                        Due to our structured and selective process, only a limited number of candidates are onboarded each cycle.
                      </h3>
                      {/* <p className="mt-2 max-w-[56ch] text-sm text-[#d1d2d7]">
                        We prioritise quality over quantity — apply early or join the waiting list to reserve consideration in the next intake.
                      </p> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="px-6 pb-20 md:px-10 md:pb-28">
          <Reveal className="mx-auto max-w-[1180px] overflow-hidden rounded-[2.2rem] border border-[rgba(200,169,107,0.25)] bg-[radial-gradient(circle_at_50%_10%,rgba(200,169,107,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-14 text-center sm:px-10 md:py-20">
            <span className="nst-kicker">Take The Next Step</span>
            <h2 className="mx-auto mt-8 text-center nst-display text-[2rem] leading-[1.1] tracking-[-0.03em] text-white sm:text-[2.6rem] md:text-[3.4rem]">
              Looking to explore international career pathways?
            </h2>
            <div className="mx-auto mt-7 h-px w-[4.5rem] bg-[linear-gradient(90deg,transparent,#c8a96b,transparent)]" />
            <p className="mx-auto mt-8 max-w-[760px] text-base leading-8 text-[#d1d2d7] sm:text-lg">
              Check if you meet the criteria to begin your international career journey with NextStep Talent.
            </p>
            <div className="mt-10">
              <Link to="/evaluation-program" className="nst-outline-button inline-flex min-w-[280px] justify-center">
                Check Eligibility
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
