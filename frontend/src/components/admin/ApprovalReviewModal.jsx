import { useEffect, useState } from 'react';
import Button from '../Button';
import Modal from '../Modal';
import AuditHistoryPanel from './AuditHistoryPanel';

const humanize = (value) =>
  String(value || '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

export default function ApprovalReviewModal({
  isOpen,
  onClose,
  title,
  candidate,
  currentStage,
  currentStatus,
  summaryRows = [],
  evidenceItems = [],
  history = [],
  warningText = 'You must review the submitted evidence before making a decision.',
  decisionOptions = [],
  onSubmit,
}) {
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [viewedEvidence, setViewedEvidence] = useState({});
  const [submittingDecision, setSubmittingDecision] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNote('');
      setConfirmed(false);
      setViewedEvidence({});
      setSubmittingDecision('');
    }
  }, [isOpen]);

  const requiredEvidence = evidenceItems.filter((item) => item.required !== false);
  const evidenceViewed = requiredEvidence.length
    ? requiredEvidence.every((item) => viewedEvidence[item.key])
    : false;

  const openEvidence = (item) => {
    if (item.onOpen) item.onOpen();
    else if (item.href) window.open(item.href, '_blank', 'noopener,noreferrer');
    setViewedEvidence((prev) => ({ ...prev, [item.key]: true }));
  };

  const submitDecision = async (decision) => {
    if (!note.trim() || !confirmed || !evidenceViewed) return;
    setSubmittingDecision(decision);
    try {
      await onSubmit?.({
        decision,
        reasonNote: note.trim(),
        reviewConfirmed: true,
        evidenceViewed: true,
      });
      onClose?.();
    } finally {
      setSubmittingDecision('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !submittingDecision && onClose?.()} title={title}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-blue-400/30 bg-blue-50/10 p-4 text-sm text-slate-100">
          <p className="font-semibold text-white">{candidate?.name || candidate?.email}</p>
          <p className="mt-1 text-slate-300">{candidate?.email || '—'}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Current Stage</p>
              <p className="mt-1 text-sm text-white">{currentStage || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Current Status</p>
              <p className="mt-1 text-sm text-white">{humanize(currentStatus)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-blue-200">{warningText}</p>
        </div>

        {!!summaryRows.length && (
          <div className="grid gap-3 md:grid-cols-2">
            {summaryRows.map((row) => (
              <div key={row.label} className="rounded-2xl bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">{row.label}</p>
                <p className="mt-1 text-sm text-white">{row.value || '—'}</p>
              </div>
            ))}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-white">Submitted Evidence</h4>
          <div className="mt-3 space-y-2">
            {evidenceItems.map((item) => (
              <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.description || 'Open and review before deciding.'}</p>
                </div>
                <Button variant="adminSecondary" type="button" onClick={() => openEvidence(item)}>
                  {viewedEvidence[item.key] ? 'Reviewed' : item.buttonLabel || 'Open Review'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white" htmlFor="approval-note">Decision Reason / Note</label>
          <textarea
            id="approval-note"
            className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-300"
            placeholder="Explain what you reviewed and why you are approving or rejecting this submission."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>I have reviewed the submitted profile, documents, or payment proof and I understand this action will be recorded in the audit history.</span>
        </label>

        <div>
          <h4 className="text-sm font-semibold text-white">Previous Approval History</h4>
          <div className="mt-3 max-h-64 overflow-auto pr-1">
            <AuditHistoryPanel history={history} />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="adminGhost" type="button" onClick={onClose} disabled={Boolean(submittingDecision)}>
            Cancel
          </Button>
          {decisionOptions.map((option) => (
            <Button
              key={option.value}
              variant={option.variant || 'primary'}
              type="button"
              disabled={!note.trim() || !confirmed || !evidenceViewed || Boolean(submittingDecision)}
              onClick={() => submitDecision(option.value)}
            >
              {submittingDecision === option.value ? 'Saving...' : option.label}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
