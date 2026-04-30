export default function ProgressBar({ total, current }) {
  const width = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div className="mb-4 h-2 w-full rounded-full bg-slate-200">
      <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${width}%` }} />
    </div>
  );
}
