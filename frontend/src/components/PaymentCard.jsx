import Card from './Card';

export default function PaymentCard({ title, amount, children, badge }) {
  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-3 flex items-center gap-3">
        <p className="text-3xl font-extrabold text-slate-900">USD {amount}</p>
        {badge && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{badge}</span>}
      </div>
      <div className="mt-4 text-sm text-slate-600">{children}</div>
    </Card>
  );
}
