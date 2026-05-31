const isOptionGroup = (option) => Boolean(option && typeof option === 'object' && Array.isArray(option.options));

export default function Select({ label, options = [], error, required = false, ...props }) {
  const normalizedOptions = options.map((option) => {
    if (typeof option === 'string') {
      return { type: 'option', value: option, label: option };
    }

    if (isOptionGroup(option)) {
      return {
        type: 'group',
        label: option.label,
        options: option.options.map((groupOption) =>
          typeof groupOption === 'string'
            ? { value: groupOption, label: groupOption }
            : { value: groupOption.value, label: groupOption.label ?? groupOption.value },
        ),
      };
    }

    return {
      type: 'option',
      value: option.value,
      label: option.label ?? option.value,
    };
  });
  const currentValue = typeof props.value === 'string' ? props.value : '';
  const hasCurrentValue = !currentValue || normalizedOptions.some((option) =>
    option.type === 'group'
      ? option.options.some((groupOption) => groupOption.value === currentValue)
      : option.value === currentValue,
  );

  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[#d3d3d8]">
          {label}
          {required && <span className="ml-1 text-rose-600">*</span>}
        </span>
      )}
      <select
        className={`w-full rounded-lg border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.035)] px-3 py-2.5 text-sm text-[#f7f3ea] outline-none transition focus:border-[#c8a96b] focus:ring-2 focus:ring-[#c8a96b]/20 ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}`.trim()}
        required={required}
        {...props}
      >
        <option value="" className="text-[#9ca3af]">Select</option>
        {!hasCurrentValue && currentValue && (
          <option value={currentValue} disabled className="text-black">
            {currentValue}
          </option>
        )}
        {normalizedOptions.map((option) =>
          option.type === 'group' ? (
            <optgroup key={option.label} label={option.label}>
              {option.options.map((groupOption) => (
                <option key={groupOption.value} value={groupOption.value} className="text-black">
                  {groupOption.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={option.value} value={option.value} className="text-black">
              {option.label}
            </option>
          ),
        )}
      </select>
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
