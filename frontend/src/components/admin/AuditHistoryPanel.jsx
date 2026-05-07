const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const humanize = (value) =>
  String(value || '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

export default function AuditHistoryPanel({ history = [], emptyMessage = 'No audit history recorded yet.' }) {
  if (!history.length) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{humanize(item.approvalType)}</p>
              <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {humanize(item.decision)}
            </span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Status Change</p>
              <p className="mt-1 text-sm text-slate-700">{humanize(item.previousStatus)} to {humanize(item.newStatus)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Handled By</p>
              <p className="mt-1 text-sm text-slate-700">{item.adminName || 'Admin'} ({humanize(item.adminRole)})</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Admin Email</p>
              <p className="mt-1 text-sm text-slate-700">{item.adminEmail || 'Restricted'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Source</p>
              <p className="mt-1 text-sm text-slate-700">{item.sourcePage || 'Admin panel'}</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Reason / Note</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.reasonNote || 'No note provided.'}</p>
          </div>

          {(item.ipAddress || item.userAgent) && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">IP Address</p>
                <p className="mt-1 text-sm text-slate-700">{item.ipAddress || 'Restricted'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">User Agent</p>
                <p className="mt-1 break-words text-sm text-slate-700">{item.userAgent || 'Restricted'}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
