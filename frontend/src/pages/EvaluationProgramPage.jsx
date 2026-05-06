import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function EvaluationProgramPage() {
  const evaluationCriteria = [
    'Your academic and professional background',
    'Your eligibility for international roles',
    'Your language proficiency and skill readiness',
    'Your alignment with current global requirements',
  ];

  const includedItems = [
    'Initial profile assessment',
    'Eligibility screening aligned with current global requirements',
    'Basic gap analysis (skills, education, language)',
    'Direction on next steps within the process',
  ];

  const importantNotes = [
    'This is an evaluation process, not a job application',
    'This does not guarantee employment or placement',
    'Progression is based on eligibility and external requirements',
    'Only shortlisted candidates move forward to the next stage',
  ];

  const suitableFor = [
    'Are serious about international career opportunities',
    'Are open to relocation or global roles',
    'Meet basic educational qualifications',
    'Are willing to meet language or certification requirements where applicable',
  ];

  return (
    <div className="nst-shell">
      <Navbar />
      <main className="pt-24">
        <section className="nst-home-section py-20">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-6 lg:grid-cols-2">
            <div>
              <h1 className="mb-6 nst-display text-4xl font-bold tracking-tight text-white lg:text-5xl">
                International Career Eligibility & Evaluation Program
              </h1>
              <p className="text-lg leading-relaxed text-[#d1d2d7]">
                Begin your application for global career opportunities across Europe, United States, and other
                international markets.
              </p>
            </div>
            <div className="relative h-[520px] overflow-hidden rounded-2xl border border-[rgba(200,169,107,0.34)] shadow-xl">
              <img
                className="h-full w-full object-cover"
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
                alt="Evaluation Program"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/10 to-transparent" />
            </div>
          </div>
        </section>

        <section className="nst-home-section py-20">
          <div className="mx-auto grid max-w-[1000px] gap-8 px-6">
            <div className="nst-card rounded-xl border border-[rgba(200,169,107,0.22)] p-8">
              <h2 className="mb-6 nst-display text-3xl font-bold text-white">About the Evaluation Process</h2>
              <p className="text-base leading-8 text-[#d1d2d7]">
                At NextStep Talent, we operate a structured International Career Evaluation &amp; Readiness Program designed to
                assess and prepare candidates for global opportunities.
              </p>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#d7bf92]">
                This initial stage helps us evaluate
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {evaluationCriteria.map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-6 text-[#e5e6ea]"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-base leading-8 text-[#d1d2d7]">
                Only candidates who meet the evaluation criteria will progress to the next stage.
              </p>
            </div>

            <div className="nst-card rounded-xl border border-[rgba(200,169,107,0.22)] p-8 text-white">
              <h3 className="mb-5 nst-display text-2xl font-semibold">What This Step Includes</h3>
              <p className="mb-4 text-base text-[#d1d2d7]">By completing this evaluation process, you will receive:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {includedItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-lg border border-[rgba(200,169,107,0.22)] bg-[rgba(200,169,107,0.09)] p-4"
                  >
                    <span className="mt-0.5 material-symbols-outlined text-[#f4dfb2]">task_alt</span>
                    <p className="text-sm leading-6 text-[#f2f3f6]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="nst-card rounded-xl border-l-4 border-l-[#c8a96b] p-8">
              <h3 className="mb-4 nst-display text-2xl font-semibold text-white">Important Information</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {importantNotes.map((item) => (
                  <div key={item} className="rounded-lg bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="text-sm leading-6 text-[#d1d2d7]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="nst-card rounded-xl border border-[rgba(200,169,107,0.22)] p-8">
              <h3 className="mb-4 nst-display text-2xl font-semibold text-white">Who This Is For</h3>
              <p className="mb-4 text-base text-[#d1d2d7]">This program is suitable for individuals who:</p>
              <div className="space-y-3">
                {suitableFor.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-lg bg-[rgba(255,255,255,0.02)] p-4">
                    <span className="mt-0.5 material-symbols-outlined text-[#c8a96b]">verified</span>
                    <p className="text-sm leading-6 text-[#d1d2d7]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="nst-home-section py-20">
          <div className="mx-auto max-w-[1000px] px-6">
            <h3 className="mb-4 text-xl font-bold uppercase tracking-[0.18em] text-[#f4dfb2]">IMPORTANT NOTE</h3>
            <p className="mb-10 text-base leading-8 text-[#d1d2d7]">
              Due to the structured and selective nature of our process, only a limited number of candidates are
              onboarded for each cycle.
            </p>
            <h2 className="mb-4 nst-display text-3xl font-bold text-white">Step 1: Check Your Eligibility</h2>
            <p className="mb-8 max-w-2xl text-base leading-8 text-[#d1d2d7]">
              Before proceeding further, you will complete a short eligibility check based on current requirements.
            </p>
            <p className="mb-10 max-w-2xl text-base leading-8 text-[#d1d2d7]">
              This helps determine if you qualify to enter the evaluation stage.
            </p>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#d7bf92]">
              CTA: Check Your Eligibility
            </p>
            <Link
              to="/eligibility-check"
              className="inline-flex items-center gap-2 rounded-lg border border-[#c8a96b] bg-[#c8a96b] px-8 py-4 text-sm font-semibold text-black transition hover:bg-[#d4b87e]"
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
