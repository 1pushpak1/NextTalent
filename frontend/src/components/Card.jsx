export default function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-[#c4c6cf] bg-white p-5 shadow-[0_4px_20px_-10px_rgba(0,33,71,0.08)] ${className}`}>{children}</div>;
}
