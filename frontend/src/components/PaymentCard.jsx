import Card from './Card';

export default function PaymentCard({ title, amount, children, badge }) {
  return (
    <Card>
      <h1 className="nst-display text-3xl font-bold text-[#f7f3ea]">{title}</h1>
      <div className="mt-3 flex items-center gap-3">
        <p className="text-3xl font-extrabold text-[#f4dfb2]">USD {amount}</p>
        {badge && <span className="rounded-full border border-[rgba(200,169,107,0.24)] bg-[rgba(200,169,107,0.12)] px-2.5 py-1 text-xs font-semibold text-[#e7d5ac]">{badge}</span>}
      </div>
      <div className="mt-4 text-sm text-[#bdbdc3]">{children}</div>
    </Card>
  );
}
