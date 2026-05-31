import { useEffect, useMemo, useRef, useState } from 'react';

export default function CountrySearchSelect({
  label,
  error,
  required = false,
  options = [],
  value = '',
  onChange,
  placeholder = 'Search country',
}) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const selectOption = (option) => {
    setQuery(option);
    setOpen(false);
    onChange?.({ target: { value: option } });
  };

  return (
    <div className="block" ref={wrapperRef}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[#d3d3d8]">
          {label}
          {required && <span className="ml-1 text-rose-600">*</span>}
        </span>
      )}
      <div className="relative">
        <input
          className={`w-full rounded-lg border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.035)] px-3 py-2.5 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#8f8f96] focus:border-[#c8a96b] focus:ring-2 focus:ring-[#c8a96b]/20 ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}`.trim()}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange?.(event);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {open && (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-[rgba(200,169,107,0.22)] bg-[#111318] shadow-xl">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-[#f7f3ea] transition hover:bg-[rgba(200,169,107,0.14)]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-[#bdbdc3]">No countries found</div>
            )}
          </div>
        )}
      </div>
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </div>
  );
}
