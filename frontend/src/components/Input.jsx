export default function Input({ label, error, required = false, inputClassName = '', rightIcon = null, ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[#d3d3d8]">
          {label}
          {required && <span className="ml-1 text-rose-600">*</span>}
        </span>
      )}
      <span className="relative block">
        <input
          className={`w-full rounded-lg border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.035)] px-3 py-2.5 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#8f8f96] focus:border-[#c8a96b] focus:ring-2 focus:ring-[#c8a96b]/20 ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''} ${rightIcon ? 'pr-10' : ''} ${inputClassName}`.trim()}
          required={required}
          {...props}
        />
        {rightIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            {rightIcon}
          </span>
        )}
      </span>
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
