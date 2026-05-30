import { useState, useId } from 'react';

export default function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const id = useId();

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          id={`accordion-button-${id}`}
          aria-controls={`accordion-panel-${id}`}
          onClick={() => setOpen((s) => !s)}
          className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-[#002147]"
        >
          <span>{title}</span>
          <span className={`material-symbols-outlined transition-transform ${open ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
      </h3>
      <div
        id={`accordion-panel-${id}`}
        role="region"
        aria-labelledby={`accordion-button-${id}`}
        className={`px-4 pb-4 ${open ? 'block' : 'hidden'} text-sm text-[#44474e]`}
      >
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}
