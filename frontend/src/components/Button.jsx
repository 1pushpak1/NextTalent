export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const variants = {
    primary:
      'bg-[#c8a96b] text-black border border-[#c8a96b] hover:-translate-y-0.5 hover:bg-[#d4b87e] hover:border-[#d4b87e] hover:shadow-[0_0_26px_rgba(200,169,107,0.28)]',
    secondary:
      'bg-white text-[#111318] border border-[rgba(200,169,107,0.38)] hover:-translate-y-0.5 hover:bg-[#fffaf1] hover:shadow-[0_0_22px_rgba(200,169,107,0.12)]',
    danger: 'bg-rose-700 text-white hover:-translate-y-0.5 hover:bg-rose-600',
    ghost: 'bg-transparent text-[#002147] hover:-translate-y-0.5 hover:bg-slate-100',
  };

  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
