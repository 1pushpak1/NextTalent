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

const supportedRegions = [
  {
    name: 'United States',
    status: 'active',
    note: 'Live and actively supported through our structured placement pathway model.',
    lng: -98.5795,
    lat: 39.8283,
  },
  {
    name: 'Germany',
    status: 'active',
    note: 'A flagship active region with strong candidate demand and established process pipelines.',
    lng: 10.4515,
    lat: 51.1657,
  },
  {
    name: 'Poland',
    status: 'active',
    note: 'Open for actively progressing candidates with verified profile-readiness alignment.',
    lng: 19.1451,
    lat: 51.9194,
  },
  {
    name: 'Austria',
    status: 'active',
    note: 'Currently active with selective intake under high-precision evaluation workflows.',
    lng: 14.5501,
    lat: 47.5162,
  },
  {
    name: 'Switzerland',
    status: 'active',
    note: 'Active support for high-readiness candidates meeting language and role expectations.',
    lng: 8.2275,
    lat: 46.8182,
  },
  {
    name: 'United Kingdom',
    status: 'upcoming',
    note: 'Upcoming market in our roadmap and currently in phased pre-activation planning.',
    lng: -3.436,
    lat: 55.3781,
  },
  {
    name: 'Spain',
    status: 'upcoming',
    note: 'Planned for activation as part of the upcoming expansion phase.',
    lng: -3.7492,
    lat: 40.4637,
  },
  {
    name: 'Italy',
    status: 'upcoming',
    note: 'Upcoming in our near-term Europe expansion sequence.',
    lng: 12.5674,
    lat: 41.8719,
  },
];

const stats = [
  { value: '40+', label: 'Years of collective experience' },
  { value: '4', label: 'Global regions supported' },
  { value: '100%', label: 'Structured process approach' },
];

const navigationLinks = [
  { href: '/', label: 'Home' },
  { href: '/evaluation-program', label: 'Evaluation Program' },
  { href: '/eligibility-check', label: 'Eligibility Check' },
];

export default function HomePage() {
  return (
    <div className="nst-shell nst-home-shell">
      <Navbar navigationLinks={navigationLinks} />
      <main className="bg-[#050505] text-white">
        <section id="hero" className="relative flex min-h-screen items-center overflow-hidden px-6 pt-28 pb-[4.5rem] md:px-10">
          <ParticleField className="absolute inset-0 h-full w-full opacity-100" />
          <ParticleField className="absolute inset-x-0 bottom-0 h-[42%] w-full opacity-100" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(200,169,107,0.14),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.06),transparent_45%),linear-gradient(180deg,rgba(5,5,5,0.25)_0%,#050505_86%)]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(5,5,5,0.96))]" />

          <div className="relative mx-auto flex w-full max-w-[1180px] justify-center">
            <Reveal className="mx-auto max-w-[860px] text-center">
              <span className="nst-kicker">Global Platform</span>
              <h1 className="mt-8 nst-display text-[4.2rem] leading-[0.88] tracking-[-0.05em] text-white sm:text-[5.4rem] md:text-[7.4rem]">
                <span className="block">NextStep</span>
                <span className="nst-display italic text-[#c8a96b]">Talent</span>
              </h1>
              <p className="mt-7 nst-display text-[1.5rem] italic text-[#c8a96b] sm:text-[1.8rem] md:text-[2.25rem]">
                Building Global Career Pathways
              </p>
              <div className="mx-auto mt-8 h-px w-[4.5rem] bg-[linear-gradient(90deg,transparent,#c8a96b,transparent)]" />
              <p className="mx-auto mt-8 max-w-[760px] text-base leading-8 text-[#d2d2d6] sm:text-lg">
                Structured pathways for individuals seeking international career opportunities through profile
                evaluation, alignment, and readiness.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/evaluation-program" className="nst-outline-button min-w-[280px] text-center">
                  Explore Current Opportunities
                </Link>
                <Link to="/eligibility-check" className="nst-ghost-button min-w-[240px] text-center">
                  Check Eligibility
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="who-we-are" className="nst-home-section px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto grid max-w-[1180px] gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <Reveal>
              <span className="nst-kicker">Who We Are</span>
              <h2 className="mt-6 nst-display max-w-[820px] text-[2.9rem] leading-[0.98] tracking-[-0.04em] text-white sm:text-[3.6rem] md:text-[4.55rem]">
                A global platform built on <span className="italic text-[#c8a96b]">experience</span> and precision.
              </h2>
              <div className="mt-10 space-y-7 text-[1.02rem] leading-8 text-[#cdced3]">
                <p>
                  NextStep Talent is a United States-based global platform focused on building structured career pathways for individuals seeking opportunities beyond their home countries.
                </p>
                <p>
                Backed by a team with over 40+ years of collective experience in education, international programs, and global engagement, we bring deep industry insight and strong global networks to support candidates in navigating complex international career journeys.
                 </p>
                <p>
                Our approach is process-driven, selective, and designed to ensure that every candidate is aligned, prepared, and positioned for the right international opportunities. 
                </p>
              </div>
            </Reveal>

            <div className="grid gap-4">
              {stats.map((stat, index) => (
                <Reveal
                  key={stat.label}
                  delay={index * 90}
                  className="nst-glass-card nst-hover-gold rounded-[1.8rem] border border-[rgba(200,169,107,0.2)] p-7 md:p-8"
                >
                  <div className="mb-6 h-px w-14 bg-[linear-gradient(90deg,#c8a96b,transparent)]" />
                  <div className="nst-display text-[3.3rem] leading-none text-[#c8a96b]">{stat.value}</div>
                  <p className="mt-3 text-[0.8rem] uppercase tracking-[0.28em] text-[#cfc2a0]">{stat.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="process" className="nst-home-section relative overflow-hidden px-6 py-20 md:px-10 md:py-28">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(200,169,107,0.35),transparent)]" />
          <div className="mx-auto max-w-[1180px]">
            <Reveal className="max-w-[780px]">
              <span className="nst-kicker">What We Do</span>
              <h2 className="mt-6 nst-display text-[2.9rem] leading-[1] tracking-[-0.04em] text-white sm:text-[3.6rem] md:text-[4.55rem]">
                A structured process, at every stage.
              </h2>
              <p className="mt-8 max-w-[700px] text-base leading-8 text-[#cfd0d4] sm:text-lg">
              We offer a structured and selective process designed to support candidates at every stage of their international career journey:
                </p>
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

            <WorldMapPanel regions={supportedRegions} />
          </div>
        </section>

        <section id="notice" className="nst-home-section px-6 py-24 text-center md:px-10 md:py-32">
          <Reveal className="mx-auto max-w-[980px]">
            <span className="nst-kicker">Important Notice</span>
            <h2 className="mt-8 nst-display text-[2rem] leading-[1.18] tracking-[-0.03em] text-white sm:text-[2.55rem] md:text-[3.3rem]">
              Due to the structured and selective nature of our process, only a {' '}
              <span className="italic text-[#c8a96b]">limited number</span> of candidates are onboarded for each
              cycle.
            </h2>
          </Reveal>
        </section>

        <section className="px-6 pb-20 md:px-10 md:pb-28">
          <Reveal className="mx-auto max-w-[1180px] overflow-hidden rounded-[2.2rem] border border-[rgba(200,169,107,0.25)] bg-[radial-gradient(circle_at_50%_10%,rgba(200,169,107,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-14 text-center sm:px-10 md:py-20">
            <span className="nst-kicker">Take The Next Step</span>
            <h2 className="mx-auto mt-8 max-w-[860px] text-center nst-display text-[2rem] leading-[1.1] tracking-[-0.03em] text-white sm:text-[2.6rem] md:text-[3.4rem]">
              Looking to explore international career pathways?
            </h2>
            <div className="mx-auto mt-7 h-px w-[4.5rem] bg-[linear-gradient(90deg,transparent,#c8a96b,transparent)]" />
            <p className="mx-auto mt-8 max-w-[760px] text-base leading-8 text-[#d1d2d7] sm:text-lg">
              Check if you meet the criteria to begin your international career journey with NextStep Talent.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#d3bc8c]">
              <Link to="/#who-we-are" className="transition hover:text-white">Who We Are</Link>
              <span className="text-[rgba(200,169,107,0.55)]">|</span>
              <Link to="/#process" className="transition hover:text-white">Process</Link>
              <span className="text-[rgba(200,169,107,0.55)]">|</span>
              <Link to="/#regions" className="transition hover:text-white">Regions</Link>
            </div>
            <div className="mt-10">
              <Link to="/eligibility-check" className="nst-outline-button inline-flex min-w-[280px] justify-center">
                Check Your Eligibility
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
