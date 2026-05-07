export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const variants = {
    primary:
      'bg-[#c8a96b] text-black border border-[#c8a96b] hover:-translate-y-0.5 hover:bg-[#d4b87e] hover:border-[#d4b87e] hover:shadow-[0_0_26px_rgba(200,169,107,0.28)]',
    secondary:
      'bg-white text-[#111318] border border-[rgba(200,169,107,0.38)] hover:-translate-y-0.5 hover:bg-[#fffaf1] hover:shadow-[0_0_22px_rgba(200,169,107,0.12)]',
    danger: 'bg-rose-700 text-white hover:-translate-y-0.5 hover:bg-rose-600',
    ghost: 'bg-transparent text-[#002147] hover:-translate-y-0.5 hover:bg-slate-100',
    adminPrimary:
      'bg-[#1d4ed8] text-white border border-[#1d4ed8] hover:-translate-y-0.5 hover:bg-[#1e40af] hover:border-[#1e40af] hover:shadow-[0_0_24px_rgba(37,99,235,0.28)]',
    adminSecondary:
      'bg-white text-[#0f172a] border border-[rgba(37,99,235,0.28)] hover:-translate-y-0.5 hover:bg-[#eff6ff] hover:shadow-[0_0_22px_rgba(37,99,235,0.12)]',
    adminGhost:
      'bg-transparent text-[#1d4ed8] border border-transparent hover:-translate-y-0.5 hover:bg-[#eff6ff]',
  };

  return (
    <button
      className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
