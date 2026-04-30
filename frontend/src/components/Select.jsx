export default function Select({ label, options = [], error, required = false, ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[#44474e]">
          {label}
          {required && <span className="ml-1 text-rose-600">*</span>}
        </span>
      )}
      <select
        className="w-full rounded-lg border border-[#c4c6cf] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#3a5f94] focus:ring-2 focus:ring-[#3a5f94]/20"
        required={required}
        {...props}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
