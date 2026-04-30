export default function StatusBadge({ status }) {
  const cls = {
    Pending: 'bg-slate-200 text-slate-700',
    Completed: 'bg-emerald-100 text-emerald-800',
    'Under Review': 'bg-amber-100 text-amber-800',
    'In Progress': 'bg-sky-100 text-sky-800',
    Ongoing: 'bg-amber-100 text-amber-800',
    Accepted: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-rose-100 text-rose-800',
    Uploaded: 'bg-indigo-100 text-indigo-800',
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls[status] || cls.Pending}`}>{status}</span>;
}
