import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../../api/axios';
import usePermissions from '../../hooks/usePermissions';

const hiringPartners = ['Nordic Talent Partners', 'EuroTech Careers', 'Global Hiring Bridge'];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const actionConfig = {
  accepted: {
    icon: 'check_circle',
    label: 'Accept',
    iconClass: 'text-emerald-600 border-emerald-300 bg-emerald-50',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  rejected: {
    icon: 'cancel',
    label: 'Reject',
    iconClass: 'text-rose-600 border-rose-300 bg-rose-50',
    buttonClass: 'bg-rose-600 hover:bg-rose-500 text-white',
  },
  under_review: {
    icon: 'pending',
    label: 'Under Review',
    iconClass: 'text-sky-600 border-sky-300 bg-sky-50',
    buttonClass: 'bg-sky-600 hover:bg-sky-500 text-white',
  },
};

const stepStatusLabel = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  under_review: 'Under Review',
  pending: 'Pending',
};

export default function AdminCandidateTable({ rows = [], loading = false, stageKey = '', onUpdated }) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [selectedActionById, setSelectedActionById] = useState({});
  const [selectedPartnerById, setSelectedPartnerById] = useState({});
  const [interviewDraftById, setInterviewDraftById] = useState({});
  const [savingCandidateId, setSavingCandidateId] = useState('');

  if (loading) return <p className="text-sm text-slate-500">Loading applications...</p>;
  if (!rows.length) return <p className="text-sm text-slate-500">No applications found for this stage.</p>;

  const hasStagePermission = (
    (stageKey === 'evaluation' && can('evaluation:approve')) ||
    (stageKey === 'document-verification' && can('documents:verify')) ||
    (stageKey === 'interviews' && can('interviews:manage')) ||
    (!['evaluation', 'document-verification', 'interviews'].includes(stageKey) && can('candidates:update'))
  );
  const isActionStep = Boolean(stageKey && !['dashboard', 'testimonials'].includes(stageKey) && hasStagePermission);

  const chooseAction = (candidateId, action) => {
    setSelectedActionById((prev) => ({ ...prev, [candidateId]: action }));
  };

  const completeStep = async (candidateId, fallbackAction = '') => {
    const selected = selectedActionById[candidateId] || fallbackAction;
    if (!selected || !isActionStep) return;
    setSavingCandidateId(candidateId);
    try {
      const payload = { status: selected };
      if (stageKey === 'hiring' && selected === 'accepted') {
        const hiringPartner = selectedPartnerById[candidateId] || '';
        if (!hiringPartner) {
          alert('Please select a hiring partner first.');
          setSavingCandidateId('');
          return;
        }
        payload.hiringPartner = hiringPartner;
      }
      await api.put(`/admin/candidates/${candidateId}/stage/${stageKey}/decision`, payload);
      if (onUpdated) onUpdated();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to update step status');
    } finally {
      setSavingCandidateId('');
    }
  };

  const scheduleInterview = async (candidateId) => {
    const draft = interviewDraftById[candidateId] || {};
    const missingFields = [];
    if (!String(draft.hiringPartner || '').trim()) missingFields.push('partner');
    if (!String(draft.country || '').trim()) missingFields.push('country');
    if (!String(draft.role || '').trim()) missingFields.push('role');
    if (!String(draft.date || '').trim()) missingFields.push('date');
    if (!String(draft.time || '').trim()) missingFields.push('time');

    if (missingFields.length) {
      alert(`Please fill the interview schedule fields first: ${missingFields.join(', ')}.`);
      return;
    }

    setSavingCandidateId(candidateId);
    try {
      await api.post(`/admin/candidates/${candidateId}/interviews`, {
        hiringPartner: String(draft.hiringPartner || '').trim(),
        country: String(draft.country || '').trim(),
        role: String(draft.role || '').trim(),
        date: String(draft.date || '').trim(),
        time: String(draft.time || '').trim(),
        meetingLink: String(draft.meetingLink || '').trim(),
      });
      if (onUpdated) onUpdated();
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to schedule interview');
    } finally {
      setSavingCandidateId('');
    }
  };

  const completeButtonLabel = (currentAction, candidateId) => {
    if (savingCandidateId === candidateId) return 'Saving...';
    if (stageKey === 'hiring' && currentAction === 'accepted') return 'Transfer';
    if (stageKey === 'interviews' && currentAction === 'accepted') {
      const hasScheduledInterview = String(rows.find((row) => row._id === candidateId)?.latestInterviewStatus || '').toLowerCase() === 'scheduled';
      return hasScheduledInterview ? 'Mark Interview Completed' : 'Schedule Interview';
    }
    return 'Complete';
  };

  const getInterviewDraft = (candidateId) => interviewDraftById[candidateId] || {};
  const isInterviewDraftReady = (candidateId) => {
    const draft = getInterviewDraft(candidateId);
    return Boolean(
      String(draft.hiringPartner || '').trim() &&
      String(draft.country || '').trim() &&
      String(draft.role || '').trim() &&
      String(draft.date || '').trim() &&
      String(draft.time || '').trim(),
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Current Stage</th>
              <th className="px-4 py-3">Pipeline Status</th>
              <th className="px-4 py-3">Date</th>
              {stageKey === 'testimonials' && <th className="px-4 py-3">Testimonial</th>}
              {isActionStep && <th className="px-4 py-3">Step Status</th>}
              {isActionStep && <th className="px-4 py-3">Step Action</th>}
              <th className="px-4 py-3">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const persisted = String(row.stepStatus || '').toLowerCase();
              const currentAction = selectedActionById[row._id] || (actionConfig[persisted] ? persisted : '');
              return (
                <tr key={row._id} className="border-t border-slate-100 transition hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{row.name || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{row.email || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{row.country || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{row.currentStage || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{row.status || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                {stageKey === 'testimonials' && (
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    <p>{row.testimonialText || '—'}</p>
                  </td>
                )}
                {isActionStep && (
                  <td className="px-4 py-3 text-slate-700">
                    {stageKey === 'interviews' && row.latestInterviewStatus
                      ? row.latestInterviewStatus
                      : stepStatusLabel[String(row.stepStatus || '').toLowerCase()] || stepStatusLabel.pending}
                  </td>
                )}
                {isActionStep && (
                  <td className="px-4 py-3 align-top">
                    {stageKey === 'hiring' ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                          value={selectedPartnerById[row._id] || ''}
                          onChange={(e) => setSelectedPartnerById((prev) => ({ ...prev, [row._id]: e.target.value }))}
                        >
                          <option value="">Select partner</option>
                          {hiringPartners.map((partner) => (
                            <option key={partner} value={partner}>{partner}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => completeStep(row._id, 'accepted')}
                          disabled={savingCandidateId === row._id || !selectedPartnerById[row._id]}
                        >
                          {completeButtonLabel('accepted', row._id)}
                        </button>
                      </div>
                    ) : stageKey === 'interviews' ? (
                      <div className="min-w-[420px] rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interview Action</p>
                            <p className="text-xs text-slate-500">
                              {String(row.latestInterviewStatus || '').toLowerCase() === 'scheduled'
                                ? 'Interview already scheduled. Complete it from here.'
                                : 'Schedule the interview first, then complete it later.'}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                            {row.latestInterviewStatus || 'Not Scheduled'}
                          </span>
                        </div>

                        {String(row.latestInterviewStatus || '').toLowerCase() === 'scheduled' ? (
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => completeStep(row._id, 'accepted')}
                            disabled={savingCandidateId === row._id}
                            title="Mark interview completed"
                          >
                            {completeButtonLabel('accepted', row._id)}
                          </button>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            <select
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none transition focus:border-[#002147]"
                              value={interviewDraftById[row._id]?.hiringPartner || ''}
                              onChange={(e) => setInterviewDraftById((prev) => ({
                                ...prev,
                                [row._id]: { ...(prev[row._id] || {}), hiringPartner: e.target.value },
                              }))}
                            >
                              <option value="">Select partner</option>
                              {hiringPartners.map((partner) => (
                                <option key={partner} value={partner}>{partner}</option>
                              ))}
                            </select>
                            <input
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none transition focus:border-[#002147]"
                              type="text"
                              placeholder="Role"
                              value={interviewDraftById[row._id]?.role || ''}
                              onChange={(e) => setInterviewDraftById((prev) => ({
                                ...prev,
                                [row._id]: { ...(prev[row._id] || {}), role: e.target.value },
                              }))}
                            />
                            <input
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none transition focus:border-[#002147]"
                              type="text"
                              placeholder="Country"
                              value={interviewDraftById[row._id]?.country || row.country || ''}
                              onChange={(e) => setInterviewDraftById((prev) => ({
                                ...prev,
                                [row._id]: { ...(prev[row._id] || {}), country: e.target.value },
                              }))}
                            />
                            <input
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none transition focus:border-[#002147]"
                              type="date"
                              value={interviewDraftById[row._id]?.date || ''}
                              onChange={(e) => setInterviewDraftById((prev) => ({
                                ...prev,
                                [row._id]: { ...(prev[row._id] || {}), date: e.target.value },
                              }))}
                            />
                            <input
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none transition focus:border-[#002147]"
                              type="time"
                              value={interviewDraftById[row._id]?.time || ''}
                              onChange={(e) => setInterviewDraftById((prev) => ({
                                ...prev,
                                [row._id]: { ...(prev[row._id] || {}), time: e.target.value },
                              }))}
                            />
                            <input
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none transition focus:border-[#002147] sm:col-span-2 xl:col-span-3"
                              type="url"
                              placeholder="Meeting link (optional)"
                              value={interviewDraftById[row._id]?.meetingLink || ''}
                              onChange={(e) => setInterviewDraftById((prev) => ({
                                ...prev,
                                [row._id]: { ...(prev[row._id] || {}), meetingLink: e.target.value },
                              }))}
                            />
                            <button
                              type="button"
                              className="rounded-lg bg-[#002147] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#01305e] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 xl:col-span-3"
                              onClick={() => scheduleInterview(row._id)}
                              disabled={savingCandidateId === row._id || !isInterviewDraftReady(row._id)}
                              title={isInterviewDraftReady(row._id) ? 'Schedule interview' : 'Fill partner, country, role, date and time first'}
                            >
                              Schedule Interview
                            </button>
                            <p className="sm:col-span-2 xl:col-span-3 text-[11px] text-slate-500">
                              Required: partner, country, role, date, and time. Meeting link is optional.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {Object.entries(actionConfig).map(([actionKey, cfg]) => {
                          const selected = currentAction === actionKey;
                          return (
                            <button
                              key={actionKey}
                              type="button"
                              className={`rounded-md border p-1.5 transition ${selected ? cfg.iconClass : 'border-slate-300 text-slate-500 hover:bg-slate-100'}`}
                              onClick={() => chooseAction(row._id, actionKey)}
                              title={cfg.label}
                              aria-label={cfg.label}
                            >
                              <span className="material-symbols-outlined text-base leading-none">{cfg.icon}</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            currentAction
                              ? actionConfig[currentAction].buttonClass
                              : 'bg-slate-300 text-slate-700'
                          }`}
                          onClick={() => completeStep(row._id, currentAction)}
                          disabled={!currentAction || savingCandidateId === row._id}
                        >
                          {completeButtonLabel(currentAction, row._id)}
                        </button>
                      </div>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => navigate(`/admin/candidate/${row._id}`)}
                  >
                    Open
                  </button>
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
