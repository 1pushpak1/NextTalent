export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-[#002147] text-white hover:opacity-90',
    secondary: 'bg-white text-[#002147] border border-[#002147] hover:bg-slate-50',
    danger: 'bg-rose-700 text-white hover:bg-rose-600',
    ghost: 'bg-transparent text-[#002147] hover:bg-slate-100',
  };

  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
