export default function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-[rgba(200,169,107,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 text-[#f7f3ea] shadow-[0_24px_70px_-42px_rgba(0,0,0,0.72)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
