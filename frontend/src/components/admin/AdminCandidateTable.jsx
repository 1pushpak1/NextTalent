import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../../api/axios';

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
  const navigate = useNavigate();
  const [selectedActionById, setSelectedActionById] = useState({});
  const [selectedPartnerById, setSelectedPartnerById] = useState({});
  const [savingCandidateId, setSavingCandidateId] = useState('');

  if (loading) return <p className="text-sm text-slate-500">Loading applications...</p>;
  if (!rows.length) return <p className="text-sm text-slate-500">No applications found for this stage.</p>;

  const isActionStep = Boolean(stageKey && !['dashboard', 'testimonials'].includes(stageKey));

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

  const completeButtonLabel = (currentAction, candidateId) => {
    if (savingCandidateId === candidateId) return 'Saving...';
    if (stageKey === 'hiring' && currentAction === 'accepted') return 'Transfer';
    if (stageKey === 'interviews' && currentAction === 'accepted') return 'Mark Interview Completed';
    return 'Complete';
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
                  <td className="px-4 py-3">
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
                      <button
                        type="button"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => completeStep(row._id, 'accepted')}
                        disabled={savingCandidateId === row._id || row.latestInterviewStatus !== 'Scheduled'}
                        title={row.latestInterviewStatus !== 'Scheduled' ? 'Open the application and schedule an interview first.' : 'Mark interview completed'}
                      >
                        {completeButtonLabel('accepted', row._id)}
                      </button>
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
