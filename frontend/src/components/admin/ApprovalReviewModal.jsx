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
  warningText = '',
  decisionOptions = [],
  onSubmit,
  initialViewedEvidenceKeys = [],
  showReasonNote = true,
  requireNote = true,
  showEvidence = true,
  showHistory = true,
  showCancel = true,
  hideClose = false,
  confirmationText = 'I have reviewed the submission and I understand this action will be recorded in the audit history.',
  defaultReasonNote = '',
}) {
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [viewedEvidence, setViewedEvidence] = useState({});
  const [submittingDecision, setSubmittingDecision] = useState('');
  const initialViewedEvidenceSignature = initialViewedEvidenceKeys.join('|');

  useEffect(() => {
    if (!isOpen) {
      setNote('');
      setConfirmed(false);
      setViewedEvidence({});
      setSubmittingDecision('');
      return;
    }

    if (initialViewedEvidenceKeys.length) {
      setViewedEvidence((current) => {
        const next = initialViewedEvidenceKeys.reduce((accumulator, key) => {
          accumulator[key] = true;
          return accumulator;
        }, {});
        const currentKeys = Object.keys(current);
        const nextKeys = Object.keys(next);
        const isSame = currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === true);
        return isSame ? current : next;
      });
    }
  }, [initialViewedEvidenceSignature, isOpen]);

  const requiredEvidence = evidenceItems.filter((item) => item.required !== false);
  const evidenceViewed = requiredEvidence.length
    ? requiredEvidence.every((item) => viewedEvidence[item.key])
    : true;
  const pendingChecks = [
    !evidenceViewed ? 'Open and review the required evidence.' : null,
    requireNote && !note.trim() ? 'Add a decision reason or note.' : null,
    !confirmed ? 'Confirm that you reviewed the submission.' : null,
  ].filter(Boolean);

  const openEvidence = (item) => {
    if (item.onOpen) item.onOpen();
    else if (item.href) window.open(item.href, '_blank', 'noopener,noreferrer');
    setViewedEvidence((prev) => ({ ...prev, [item.key]: true }));
  };

  const submitDecision = async (decision) => {
    const reasonNote = showReasonNote ? note.trim() : String(defaultReasonNote || '').trim();
    if ((requireNote && !reasonNote) || !confirmed || !evidenceViewed) return;
    setSubmittingDecision(decision);
    try {
      await onSubmit?.({
        decision,
        reasonNote,
        reviewConfirmed: true,
        evidenceViewed: true,
      });
      onClose?.();
    } finally {
      setSubmittingDecision('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !submittingDecision && onClose?.()} title={title} hideClose={hideClose}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-[rgba(200,169,107,0.3)] bg-[rgba(200,169,107,0.08)] p-4 text-sm text-slate-100">
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
          <p className="mt-3 text-sm text-[#d7c08a]">{warningText}</p>
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

        {!!evidenceItems.length && (
          <div>
            <h4 className="text-sm font-semibold text-white">Submitted Evidence</h4>
            <div className="mt-3 space-y-2">
              {evidenceItems.map((item) => (
                <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.description || 'Open and review before deciding.'}</p>
                  </div>
                  <Button variant="adminSecondary" className="text-white" type="button" onClick={() => openEvidence(item)}>
                    {viewedEvidence[item.key] ? 'Reviewed' : item.buttonLabel || 'Open Review'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showReasonNote ? (
          <div>
            <label className="block text-sm font-medium text-white" htmlFor="approval-note">Decision Reason / Note</label>
            <textarea
              id="approval-note"
              className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[rgba(200,169,107,0.5)]"
              placeholder="Explain what you reviewed and why you are approving or rejecting this submission."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        ) : null}

        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>{confirmationText}</span>
        </label>

        {!!pendingChecks.length && (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-50/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">Before you can submit a decision:</p>
            <ul className="mt-2 space-y-1">
              {pendingChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {showHistory ? (
          <div>
            <h4 className="text-sm font-semibold text-white">Previous Approval History</h4>
            <div className="mt-3 max-h-64 overflow-auto pr-1">
              <AuditHistoryPanel history={history} />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          {showCancel ? (
            <Button variant="adminGhost" type="button" onClick={onClose} disabled={Boolean(submittingDecision)}>
              Cancel
            </Button>
          ) : null}
          {decisionOptions.map((option) => (
            <Button
              key={option.value}
              variant={option.variant || 'primary'}
              className={['Keep Under Review', 'Keep Pending'].includes(option.label) ? 'text-white' : ''}
              type="button"
              disabled={(requireNote && !note.trim()) || !confirmed || !evidenceViewed || Boolean(submittingDecision)}
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
