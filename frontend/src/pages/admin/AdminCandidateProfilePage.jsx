import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAdminCandidateProfile } from '../../api/adminApi';

const humanize = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());

const Section = ({ title, children }) => <div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-base font-semibold text-slate-900">{title}</h2><div className="mt-3 text-sm text-slate-700">{children}</div></div>;

export default function AdminCandidateProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await fetchAdminCandidateProfile(id);
        if (!active) return;
        setData(data);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500">Loading candidate profile...</p>;
  if (error) return <p className="rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;

  const { candidate, profile, eligibility, payments = [], documents = [], interviews = [], testimonial, progress, adminNotes } = data || {};

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h1 className="text-xl font-bold text-slate-900">{candidate?.name || candidate?.email}</h1>
        <p className="text-sm text-slate-600">{candidate?.email} {candidate?.phone ? `• ${candidate.phone}` : ''}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4 text-sm">
          <div><p className="text-slate-500">Current Stage</p><p className="font-semibold">{progress?.currentStage}</p></div>
          <div><p className="text-slate-500">Next Required Action</p><p className="font-semibold">{progress?.nextAction}</p></div>
          <div><p className="text-slate-500">Pending From</p><p className="font-semibold">{humanize(progress?.pendingFrom)}</p></div>
          <div><p className="text-slate-500">Recommended Admin Action</p><p className="font-semibold">{progress?.recommendedAdminAction}</p></div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Personal / Account Details">Role: Candidate<br />Email Verified: {candidate?.emailVerified ? 'Yes' : 'No'}<br />Phone Verified: {candidate?.phoneVerified ? 'Yes' : 'No'}</Section>
        <Section title="Eligibility Result">Status: {eligibility?.isEligible ? 'Eligible' : 'Not Submitted / Not Eligible'}</Section>
        <Section title="Profile & Financial Disclosure">Profile: {humanize(profile?.status)}<br />Financial Disclosure: {profile?.financialDisclosureAccepted ? 'Accepted' : 'Pending'}<br />Signature: {profile?.signature ? 'Submitted' : 'Pending'}</Section>
        <Section title="Evaluation Status">{humanize(progress?.evaluationStatus)}</Section>
        <Section title="Payments & Receipts">{payments.length ? payments.map((p) => <div key={p._id}>{humanize(p.type)}: {humanize(p.status)} ({p.currency} {p.amount})</div>) : 'No payments yet'}</Section>
        <Section title="Documents & Verification">{documents.length ? documents.map((d) => <div key={d._id}>{d.documentType}: {d.status}</div>) : 'No documents yet'}</Section>
        <Section title="Interviews / Selection">{interviews.length ? interviews.map((i) => <div key={i._id}>{i.role} - {i.status} - {i.date} {i.time}</div>) : 'No interviews yet'}<br />Selection: {humanize(progress?.selectionStatus)}</Section>
        <Section title="Testimonial / Final Stage">Final Payment: {humanize(progress?.paymentStatus?.final)}<br />Testimonial: {testimonial ? 'Submitted' : 'Pending'}</Section>
      </div>

      <Section title="Admin Notes">{adminNotes || 'No notes yet'}</Section>
    </section>
  );
}
