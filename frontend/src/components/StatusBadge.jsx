export default function StatusBadge({ status }) {
  const cls = {
    Pending: 'border border-[rgba(200,169,107,0.24)] bg-[rgba(200,169,107,0.12)] text-[#e7d5ac]',
    Completed: 'border border-[rgba(34,197,94,0.5)] bg-[rgba(34,197,94,0.22)] text-white',
    'Under Review': 'border border-[rgba(200,169,107,0.24)] bg-[rgba(255,255,255,0.06)] text-[#d8c08c]',
    'In Progress': 'border border-[rgba(200,169,107,0.24)] bg-[rgba(255,255,255,0.05)] text-[#efe9da]',
    Accepted: 'border border-[rgba(34,197,94,0.5)] bg-[rgba(34,197,94,0.22)] text-white',
    Rejected: 'border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.06)] text-[#f3d9d9]',
    Inactive: 'border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#9a9aa2]',
    Uploaded: 'border border-[rgba(34,197,94,0.5)] bg-[rgba(34,197,94,0.22)] text-white',
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls[status] || cls.Pending}`}>{status}</span>;
}
