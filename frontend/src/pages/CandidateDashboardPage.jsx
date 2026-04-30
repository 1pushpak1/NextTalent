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
    cta: 'Pay Program Fee USD 3,500',
  },
  '/payment/final-payment': {
    title: 'Final payment required',
    description: 'Please complete the final payment to proceed with post-selection steps.',
    cta: 'Pay Final Program Fee',
  },
};

export default function CandidateDashboardPage() {
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api
      .get('/dashboard/me')
      .then(({ data }) => {
        setData(data);
      })
      .catch(() => setData(null));
  }, []);

  const docsIncomplete = !data?.documentStatus?.length;
  const hasInitial = data?.paymentStatus?.some((p) => p.type === 'initial' && p.status === 'completed');
  const programPaid = data?.paymentStatus?.some((p) => p.type === 'program' && p.status === 'completed');
  const finalPaid = data?.paymentStatus?.some((p) => p.type === 'final' && p.status === 'completed');
  const interviewScheduled = data?.interviewStatus?.length > 0;
  const selected = data?.candidate?.status === 'selected';
  const requiredRoute = getCandidateNextRoute(data);
  const paymentNotice = paymentRouteNotice[requiredRoute] || null;
  const timelineStages = useMemo(() => {
    const stages = Array.isArray(data?.stages) ? data.stages : [];
    if (!stages.length) return stages;

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

    // Keep exactly one Ongoing step: the immediate next actionable stage after the latest Accepted stage.
    const acceptedIndex = [...timeline]
      .map((stage, idx) => (stage.status === 'Accepted' ? idx : -1))
      .filter((idx) => idx >= 0)
      .at(-1);

    if (acceptedIndex === undefined) return timeline;

    const nextActionIndex = timeline.findIndex(
      (stage, idx) => idx > acceptedIndex && !['Completed', 'Accepted', 'Rejected'].includes(stage.status),
    );

    if (nextActionIndex === -1) return timeline;

    return timeline.map((stage, idx) => {
      if (idx === nextActionIndex) return { ...stage, status: 'Ongoing' };
      if (idx > acceptedIndex && stage.status === 'Ongoing') return { ...stage, status: 'Pending' };
      return stage;
    });
  }, [data?.stages]);

  return (
    <div className="nst-shell">
      <Navbar />
      <CandidatePortalSidebar />

      <main className="pb-20 pt-28 lg:ml-64">
        <div className="mx-auto max-w-[1200px] px-6">
          <section className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#002147]">Welcome back, {user?.name || 'Candidate'}</h1>
              <p className="max-w-2xl text-base text-[#44474e]">
                Track your international pathway progress.
              </p>
            </div>
            <div className="flex gap-3">
              {!hasInitial && (
                <Link to="/initial-payment">
                  <Button>Pay USD 500</Button>
                </Link>
              )}
              {hasInitial && docsIncomplete && (
                <Link to="/documents">
                  <Button variant="secondary">Upload Documents</Button>
                </Link>
              )}
              {data?.candidate?.status === 'documents_received' && !programPaid && (
                <Link to="/payment/program-fee">
                  <Button>Pay USD 3,500</Button>
                </Link>
              )}
            </div>
          </section>

          {paymentNotice && (
            <section className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Action Required</p>
              <h2 className="mt-1 text-xl font-bold text-amber-900">{paymentNotice.title}</h2>
              <p className="mt-1 text-sm text-amber-900">{paymentNotice.description}</p>
              <Link className="mt-3 inline-block" to={requiredRoute}>
                <Button>{paymentNotice.cta}</Button>
              </Link>
            </section>
          )}

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="nst-card rounded-xl p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Current Stage</p>
              <h3 className="text-2xl font-semibold text-[#002147]">{data?.currentStage || 'Pending'}</h3>
              <p className="mt-2 text-sm text-[#3a5f94]">Pathway Timeline Active</p>
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
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Interview Status</p>
              <h3 className="text-2xl font-semibold text-[#002147]">{interviewScheduled ? 'Scheduled' : 'Pending'}</h3>
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
                {interviewScheduled && <Link to="/interviews"><Button variant="secondary">View Interview Details</Button></Link>}
                {!hasInitial && <Link to="/initial-payment"><Button>Pay Initial USD 500</Button></Link>}
                {hasInitial && data?.candidate?.status === 'documents_received' && !programPaid && <Link to="/payment/program-fee"><Button>Pay Program Fee</Button></Link>}
                {selected && !finalPaid && <Link to="/payment/final-payment"><Button>Pay Final Program Fee</Button></Link>}
                {selected && finalPaid && <Link to="/testimonial"><Button variant="secondary">Share Testimonial</Button></Link>}
              </div>
            </div>
            <div className="nst-card rounded-xl p-6">
              <h3 className="mb-3 text-xl font-semibold text-[#002147]">Recent Activity</h3>
              <div className="space-y-3 text-sm text-[#44474e]">
                <p>Profile status: {data?.profileStatus || 'not_submitted'}</p>
                <p>Documents uploaded: {data?.documentStatus?.length || 0}</p>
                <p>Payments made: {data?.paymentStatus?.length || 0}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <div className="relative z-30">
        <Footer />
      </div>
    </div>
  );
}
