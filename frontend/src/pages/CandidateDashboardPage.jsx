import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import CandidatePortalSidebar from '../components/CandidatePortalSidebar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCandidateNextRoute } from '../utils/pathwayFlow';

const paymentRouteNotice = {
  '/initial-payment': {
    title: 'Initial payment required',
    description: 'Please complete the initial payment to continue with evaluation milestones.',
    cta: 'Pay Initial USD 500',
  },
  '/payment/program-fee': {
    title: 'Program fee required',
    description: 'Please complete the program fee payment before the next processing stage. Your dashboard and profile are still accessible.',
    cta: 'Pay Program Fee',
  },
  '/payment/final-payment': {
    title: 'Final payment required',
    description: 'Please complete the final payment to proceed with post-selection steps.',
    cta: 'Pay Final Program Fee',
  },
};
const eligibilityBurstPieces = [
  { left: '16%', delay: '0ms', duration: '2350ms', rotate: '-18deg', color: '#f59e0b' },
  { left: '24%', delay: '120ms', duration: '2550ms', rotate: '22deg', color: '#ef4444' },
  { left: '33%', delay: '60ms', duration: '2280ms', rotate: '-12deg', color: '#10b981' },
  { left: '42%', delay: '180ms', duration: '2620ms', rotate: '16deg', color: '#3b82f6' },
  { left: '50%', delay: '0ms', duration: '2450ms', rotate: '-6deg', color: '#8b5cf6' },
  { left: '58%', delay: '200ms', duration: '2580ms', rotate: '18deg', color: '#ec4899' },
  { left: '67%', delay: '90ms', duration: '2380ms', rotate: '-22deg', color: '#14b8a6' },
  { left: '76%', delay: '160ms', duration: '2520ms', rotate: '12deg', color: '#f97316' },
  { left: '84%', delay: '40ms', duration: '2300ms', rotate: '-16deg', color: '#eab308' },
];
const selectionBannerConfig = {
  Accepted: {
    eyebrow: 'Selection Result',
    title: 'Congratulations, you have been selected.',
    description: 'Your result has been announced. You are now cleared for the next step in your pathway.',
    className: 'border-emerald-500 bg-emerald-600 text-white',
    eyebrowClassName: 'text-emerald-100',
    iconWrapClassName: 'bg-white/20 text-white ring-1 ring-white/30',
  },
  Rejected: {
    eyebrow: 'Selection Result',
    title: 'This application was not selected in the current cycle.',
    description: 'We know this is disappointing. Your dashboard will continue to reflect the latest decision and any follow-up shared by the team.',
    icon: 'sentiment_sad',
    accentIcon: 'mail',
    className: 'border-rose-300 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.20),_rgba(255,241,242,0.95)_45%,_rgba(255,255,255,1)_100%)] text-rose-950',
    eyebrowClassName: 'text-rose-700',
    iconWrapClassName: 'bg-white/85 text-rose-900 ring-1 ring-rose-300',
  },
};

const isLegacyInterviewStage = (name = '') => /interview/i.test(String(name).trim());
const isIndiaResidence = (value = '') => String(value || '').trim().toLowerCase() === 'india';
const formatUsd = (amount) => `USD ${Number(amount || 0).toLocaleString('en-US')}`;

export default function CandidateDashboardPage() {
  const [data, setData] = useState(null);
  const { user } = useAuth();
  const displayFirstName =
    data?.profile?.personalDetails?.firstName ||
    user?.name?.split?.(' ')?.[0] ||
    (user?.email?.split?.('@')?.[0] || 'Candidate');
  const currentCountryOfResidence = data?.profile?.personalDetails?.currentCountryOfResidence || '';
  const programTotal = isIndiaResidence(currentCountryOfResidence) ? 3800 : 3600;

  useEffect(() => {
    api
      .get('/dashboard/me')
      .then(({ data }) => {
        setData(data);
      })
      .catch(() => setData(null));
  }, []);

  const latestProgramPayment = useMemo(() => {
    const programPayments = (data?.paymentStatus || []).filter((p) => p.type === 'program');
    if (!programPayments.length) return null;
    return [...programPayments].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
  }, [data?.paymentStatus]);

  const latestFinalPayment = useMemo(() => {
    const finalPayments = (data?.paymentStatus || []).filter((p) => p.type === 'final');
    if (!finalPayments.length) return null;
    return [...finalPayments].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
  }, [data?.paymentStatus]);

  const docsIncomplete = !data?.documentStatus?.length;
  const hasInitial = data?.paymentStatus?.some((p) => p.type === 'initial' && p.status === 'completed');
  const programPaid = latestProgramPayment?.status === 'completed';
  const programFailed = latestProgramPayment?.status === 'failed';
  const finalPending = latestFinalPayment?.status === 'pending';
  const finalFailed = latestFinalPayment?.status === 'failed';
  const finalPaid = latestFinalPayment?.status === 'completed';
  const internalEvaluationPassed = data?.profileStatus === 'accepted';
  const profileRejected = data?.profileStatus === 'rejected';
  const showEligibilityForCandidate = data?.profileStatus === 'accepted';
  const testimonialSubmitted = Boolean(data?.testimonialSubmitted);
  const testimonialPending = finalPaid && !testimonialSubmitted;
  const selected = data?.candidate?.status === 'selected';
  const journeyLocked = profileRejected || ['not_selected', 'rejected'].includes(String(data?.candidate?.status || '').toLowerCase());
  const requiredRoute = getCandidateNextRoute(data);
  const failedPaymentRoute = programFailed ? '/payment/program-fee' : finalFailed ? '/payment/final-payment' : '';
  const paymentNotice = paymentRouteNotice[requiredRoute] || null;
  const dynamicPaymentNotice = paymentNotice && requiredRoute === '/payment/program-fee'
    ? { ...paymentNotice, cta: `Pay Program Fee ${formatUsd(programTotal)}` }
    : paymentNotice;
  const failedPaymentNotice = programFailed || finalFailed
    ? {
        title: 'Payment Not Received',
        description: 'Please upload the complete and correct payment details again, including the right receipt file, or contact support to resolve this issue.',
        cta: programFailed ? 'Re-upload Program Fee Receipt' : 'Re-upload Final Payment Receipt',
      }
    : null;
  const currentStageLabel = isLegacyInterviewStage(data?.currentStage) ? 'Selection Result' : data?.currentStage || 'Pending';
  const selectionStageStatus = useMemo(() => {
    if (profileRejected) return '';
    const fromStages = (data?.stages || []).find((stage) => stage.name === 'Selection Result')?.status;
    if (fromStages) return fromStages;
    if (data?.candidate?.status === 'selected') return 'Accepted';
    if (['not_selected', 'rejected'].includes(String(data?.candidate?.status || '').toLowerCase())) return 'Rejected';
    return '';
  }, [data?.candidate?.status, data?.stages, profileRejected]);
  const selectionBanner = selectionBannerConfig[selectionStageStatus] || null;
  const timelineStages = useMemo(() => {
    const rawStages = Array.isArray(data?.stages) ? data.stages : [];
    if (!rawStages.length) return rawStages;

    const hasSelectionResultStage = rawStages.some(
      (stage) => String(stage?.name || '').trim().toLowerCase() === 'selection result',
    );
    const stages = rawStages
      .filter((stage) => !(hasSelectionResultStage && isLegacyInterviewStage(stage?.name)))
      .map((stage) =>
        isLegacyInterviewStage(stage?.name)
          ? {
              ...stage,
              name: 'Selection Result',
              status: stage.status === 'Completed' ? 'Under Review' : stage.status,
            }
          : stage,
      );

    const stageByName = new Map(stages.map((stage) => [stage.name, stage]));
    const accountCreatedDone = stageByName.get('Account Created')?.status === 'Completed';
    const profileSubmittedDone = stageByName.get('Profile Submitted')?.status === 'Completed';
    const internalEvalStatus = stageByName.get('Internal Evaluation')?.status;
    const internalEvalDone = internalEvalStatus === 'Accepted' || internalEvalStatus === 'Rejected' || internalEvalStatus === 'Under Review';
    const shouldMarkEligibilityDone =
      stageByName.get('Eligibility Check')?.status === 'Completed' ||
      accountCreatedDone ||
      profileSubmittedDone ||
      internalEvalDone;

    const normalized = stages.map((stage) =>
      stage.name === 'Eligibility Check' && shouldMarkEligibilityDone
        ? { ...stage, status: 'Completed' }
        : stage
    );

    const preferredOrder = ['Eligibility Check', 'Account Created', 'Profile Submitted', 'Internal Evaluation'];
    const normalizedByName = new Map(normalized.map((stage) => [stage.name, stage]));
    const ordered = preferredOrder.map((name) => normalizedByName.get(name)).filter(Boolean);
    const remainder = normalized.filter((stage) => !preferredOrder.includes(stage.name));
    const timeline = [...ordered, ...remainder];

    // Keep exactly one Pending step: the immediate next actionable stage after the latest Accepted stage.
    const acceptedIndex = [...timeline]
      .map((stage, idx) => (stage.status === 'Accepted' ? idx : -1))
      .filter((idx) => idx >= 0)
      .at(-1);

    if (acceptedIndex === undefined) return timeline;

    const nextActionIndex = timeline.findIndex(
      (stage, idx) => idx > acceptedIndex && !['Completed', 'Accepted', 'Rejected', 'Inactive'].includes(stage.status),
    );

    if (nextActionIndex === -1) return timeline;

    return timeline.map((stage, idx) => {
      if (idx === nextActionIndex) return { ...stage, status: 'Pending' };
      if (idx > acceptedIndex && stage.status === 'Pending') return { ...stage, status: 'Pending' };
      if (stage.status === 'Inactive') return stage;
      return stage;
    });
  }, [data]);

  return (
    <div className="nst-shell">
      <Navbar />
      <CandidatePortalSidebar />

      <main className="flex-1 pb-20 pt-28 lg:ml-64">
        <div className="mx-auto max-w-[1200px] px-6">
          <section className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#002147]">Welcome back, {displayFirstName}</h1>
              <p className="max-w-2xl text-base text-[#44474e]">
                Track your international pathway progress.
              </p>
            </div>
            <div className="flex gap-3">
              {!journeyLocked && internalEvaluationPassed && !hasInitial && (
                <Link to="/initial-payment">
                  <Button>Pay USD 500</Button>
                </Link>
              )}
              {!journeyLocked && hasInitial && docsIncomplete && (
                <Link to="/documents">
                  <Button variant="secondary">Upload Documents</Button>
                </Link>
              )}
              {!journeyLocked && data?.candidate?.status === 'documents_received' && !programPaid && (
                <Link to="/payment/program-fee">
                  <Button>Pay {formatUsd(programTotal)}</Button>
                </Link>
              )}
            </div>
          </section>

          {profileRejected && (
            <section className="mb-8 overflow-hidden rounded-[28px] border border-rose-300 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_rgba(255,241,242,0.96)_40%,_rgba(255,255,255,1)_100%)] p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Internal Evaluation Result</p>
              <h2 className="mt-2 text-3xl font-bold text-rose-950">Your profile was not approved in the current review cycle.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-rose-900">
                Your dashboard now reflects this rejection, and the next pathway steps are inactive. If the team shares any future update, it will appear here and by email.
              </p>
            </section>
          )}

          {selectionBanner && (
            selectionStageStatus === 'Accepted' ? (
              <section className={`relative mb-8 overflow-hidden rounded-[28px] border p-8 text-center shadow-sm ${selectionBanner.className}`}>
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="nst-burst-glow absolute left-1/2 top-6 h-24 w-24 -translate-x-1/2 rounded-full" />
                  {eligibilityBurstPieces.map((piece, index) => (
                    <span
                      key={index}
                      className="nst-burst-piece absolute h-4 w-2 rounded-full"
                      style={{
                        left: piece.left,
                        backgroundColor: piece.color,
                        '--nst-burst-rotate': piece.rotate,
                        animationDelay: piece.delay,
                        animationDuration: piece.duration,
                      }}
                    />
                  ))}
                </div>
                <div className="relative">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                  </div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${selectionBanner.eyebrowClassName}`}>{selectionBanner.eyebrow}</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#002147]">{selectionBanner.title}</h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm/6 text-[#44474e]">{selectionBanner.description}</p>
                </div>
              </section>
            ) : (
              <section className={`mb-8 overflow-hidden rounded-[28px] border p-6 shadow-sm ${selectionBanner.className}`}>
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${selectionBanner.iconWrapClassName}`}>
                      <span className="material-symbols-outlined text-3xl">{selectionBanner.icon}</span>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${selectionBanner.eyebrowClassName}`}>{selectionBanner.eyebrow}</p>
                      <h2 className="mt-2 text-2xl font-bold">{selectionBanner.title}</h2>
                      <p className="mt-2 max-w-2xl text-sm/6">{selectionBanner.description}</p>
                    </div>
                  </div>
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${selectionBanner.iconWrapClassName}`}>
                    <span className="material-symbols-outlined text-4xl">{selectionBanner.accentIcon}</span>
                  </div>
                </div>
              </section>
            )
          )}

          {(failedPaymentNotice || dynamicPaymentNotice) && (
            <section className={`mb-8 rounded-xl border p-5 ${failedPaymentNotice ? 'border-rose-300 bg-rose-50' : 'border-amber-300 bg-amber-50'}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Action Required</p>
              <h2 className={`mt-1 text-xl font-bold ${failedPaymentNotice ? 'text-rose-900' : 'text-amber-900'}`}>{(failedPaymentNotice || dynamicPaymentNotice).title}</h2>
              <p className={`mt-1 text-sm ${failedPaymentNotice ? 'text-rose-900' : 'text-amber-900'}`}>{(failedPaymentNotice || dynamicPaymentNotice).description}</p>
              <Link className="mt-3 inline-block" to={failedPaymentNotice ? failedPaymentRoute : requiredRoute}>
                <Button>{(failedPaymentNotice || dynamicPaymentNotice).cta}</Button>
              </Link>
            </section>
          )}

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="nst-card rounded-xl p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Current Stage</p>
              <h3 className="text-2xl font-semibold text-[#002147]">{currentStageLabel}</h3>
              {/* <p className="mt-2 text-sm text-[#3a5f94]">Pathway Timeline Active</p> */}
            </div>
            <div className="nst-card rounded-xl p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Next Action Required</p>
              <h3 className="text-2xl font-semibold text-[#002147]">{data?.nextAction || 'None'}</h3>
            </div>
            <div className="nst-card rounded-xl p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Payment Status</p>
              <h3 className="text-2xl font-semibold text-[#002147]">{data?.paymentStatus?.length || 0} Records</h3>
            </div>
            <div className="nst-card rounded-xl p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Selection Status</p>
              <h3 className="text-2xl font-semibold text-[#002147]">{selectionStageStatus || 'Pending'}</h3>
            </div>
          </section>

          <section className="nst-card mb-8 overflow-hidden rounded-xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-[#002147]">Process Timeline</h2>
              <span className="rounded-full bg-blue-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#2d476f]">Global Pathway</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {timelineStages?.map((stage) => (
                <div key={stage.name} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stage.name}</p>
                  <div className="mt-2"><StatusBadge status={stage.status} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="nst-card rounded-xl p-6 lg:col-span-2">
              <h3 className="mb-3 text-2xl font-semibold text-[#002147]">Milestone Actions</h3>
              <div className="flex flex-wrap gap-3">
                {!journeyLocked && internalEvaluationPassed && !hasInitial && <Link to="/initial-payment"><Button>Pay Initial USD 500</Button></Link>}
                {!journeyLocked && hasInitial && data?.candidate?.status === 'documents_received' && !programPaid && <Link to="/payment/program-fee"><Button>{programFailed ? 'Re-upload Program Fee Receipt' : 'Pay Program Fee'}</Button></Link>}
                {!journeyLocked && selected && !finalPaid && !finalPending && <Link to="/payment/final-payment"><Button>{finalFailed ? 'Re-upload Final Payment Receipt' : 'Pay Final Program Fee'}</Button></Link>}
                {!journeyLocked && selected && finalPending && <Button className="text-white" variant="secondary" disabled>Final Payment Under Verification</Button>}
                {!journeyLocked && testimonialPending && <Link to="/testimonial"><Button className="text-white" variant="secondary">Share Testimonial</Button></Link>}
                {!journeyLocked && finalPaid && testimonialSubmitted && <Button className="text-white" variant="secondary" disabled>Testimonial Shared</Button>}
                {journeyLocked && <Button className="text-white" variant="secondary" disabled>Next Steps Inactive</Button>}
              </div>
            </div>
            <div className="nst-card rounded-xl p-6">
              <h3 className="mb-3 text-xl font-semibold text-[#002147]">Recent Activity</h3>
              <div className="space-y-3 text-sm text-[#44474e]">
                <p>Profile status: {data?.profileStatus || 'not_submitted'}</p>
                <p>Documents uploaded: {data?.documentStatus?.length || 0}</p>
                <p>Payments made: {data?.paymentStatus?.length || 0}</p>
                <p>Final payment status: {finalPaid ? 'Received' : finalPending ? 'Under Verification' : 'Not Submitted'}</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="nst-card rounded-xl p-6">
              <h3 className="mb-3 text-xl font-semibold text-[#002147]">Candidate Profile</h3>
              <div className="space-y-2 text-sm text-[#44474e]">
                <p>Email: {data?.contact?.email || data?.candidate?.email || 'Not available'}</p>
                <p>Mobile: {data?.contact?.phone || data?.candidate?.phone || 'Not available'}</p>
                {showEligibilityForCandidate && data?.eligibility && (
                  <>
                    <p>Destination: {data.eligibility.destination || '—'}</p>
                    <p>Country: {data.eligibility.country || '—'}</p>
                    <p>IT Background: {data.eligibility.hasITBackground ? 'Yes' : 'No'}</p>
                    <p>Qualification: {data.eligibility.qualification || '—'}</p>
                  </>
                )}
              </div>
            </div>
            <div className="nst-card rounded-xl p-6">
              <h3 className="mb-3 text-xl font-semibold text-[#002147]">Eligibility Responses</h3>
              {showEligibilityForCandidate && data?.eligibility ? (
                <div className="space-y-2 text-sm text-[#44474e]">
                  <p>Destination: {data.eligibility.destination}</p>
                  <p>Country: {data.eligibility.country}</p>
                  <p>IT Background: {data.eligibility.hasITBackground ? 'Yes' : 'No'}</p>
                  <p>Qualification: {data.eligibility.qualification}</p>
                  <p>Language: {data.eligibility.languageAnswer}</p>
                  <p>Current Location: {data.eligibility.currentLocation}</p>
                  <p>Willing To Relocate: {data.eligibility.willingToRelocate ? 'Yes' : 'No'}</p>
                  <p>Comfortable With Fees: {data.eligibility.comfortableWithFees ? 'Yes' : 'No'}</p>
                </div>
              ) : (
                <p className="text-sm text-[#44474e]">Eligibility details will appear after profile verification is approved by admin.</p>
              )}
            </div>
          </section>
        </div>
      </main>
      <div className="relative z-30 lg:ml-64">
        <Footer />
      </div>
    </div>
  );
}
