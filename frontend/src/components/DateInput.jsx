import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMMDDYYYY, parseDateValue } from '../utils/dateFormat';

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getCalendarCells = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let index = startOffset - 1; index >= 0; index -= 1) {
    const day = prevMonthDays - index;
    const date = new Date(year, month - 1, day);
    cells.push({ date, outside: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, outside: false });
  }

  while (cells.length < 42) {
    const last = cells[cells.length - 1]?.date || new Date(year, month, daysInMonth);
    const date = new Date(last);
    date.setDate(date.getDate() + 1);
    cells.push({ date, outside: date.getMonth() !== month });
  }

  return cells;
};

const getYearWindowStart = (year) => year - (year % 12);

const getYearCells = (baseYear) =>
  Array.from({ length: 12 }, (_, index) => baseYear + index);

const isSameDate = (left, right) =>
  left &&
  right &&
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export default function DateInput({
  label,
  error,
  required = false,
  value = '',
  onChange,
  placeholder = 'MM/DD/YYYY',
  className = '',
}) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days');
  const [viewDate, setViewDate] = useState(() => parseDateValue(value) || new Date());

  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const displayValue = useMemo(() => String(value || ''), [value]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const updateValue = (nextDate) => {
    if (!onChange) return;
    onChange({ target: { value: formatMMDDYYYY(nextDate) } });
  };

  const handleTyping = (event) => {
    onChange?.({ target: { value: event.target.value } });
  };

  const calendarCells = getCalendarCells(viewDate.getFullYear(), viewDate.getMonth());
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const yearWindowStart = getYearWindowStart(viewDate.getFullYear());
  const yearCells = getYearCells(yearWindowStart);
  const headerLabel =
    viewMode === 'years'
      ? `${yearWindowStart} - ${yearWindowStart + 11}`
      : viewMode === 'months'
        ? String(viewDate.getFullYear())
        : monthLabel;

  return (
    <label className={`block ${className}`.trim()} ref={wrapperRef}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[#d3d3d8]">
          {label}
          {required && <span className="ml-1 text-rose-600">*</span>}
        </span>
      )}

      <div className="relative">
        <input
          className={`w-full rounded-2xl border border-[rgba(200,169,107,0.22)] bg-[rgba(255,255,255,0.045)] px-3 py-2.5 pr-12 text-sm text-[#f7f3ea] outline-none transition placeholder:text-[#8f8f96] shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm focus:border-[#c8a96b] focus:ring-2 focus:ring-[#c8a96b]/20 ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}`.trim()}
          value={displayValue}
          onChange={handleTyping}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={placeholder}
          inputMode="text"
          autoComplete="off"
          maxLength={10}
          aria-haspopup="dialog"
          aria-expanded={open}
        />
        <button
          type="button"
          onClick={() => {
            const nextOpen = !open;
            setOpen(nextOpen);
            if (nextOpen) {
              setViewMode('days');
              setViewDate(selectedDate || new Date());
            }
          }}
          className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-[#c8a96b] transition hover:text-[#e6c780]"
          aria-label="Toggle calendar"
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
        </button>

        {open && (
          <div className="absolute z-40 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-[1.5rem] border border-[rgba(200,169,107,0.22)] bg-[linear-gradient(180deg,rgba(17,19,24,0.98),rgba(12,14,18,0.98))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(200,169,107,0.18)] text-[#f4dfb2] transition hover:bg-[rgba(200,169,107,0.12)]"
                onClick={() => {
                  setViewDate((current) => (
                    viewMode === 'years'
                      ? new Date(current.getFullYear() - 12, current.getMonth(), 1)
                      : viewMode === 'months'
                        ? new Date(current.getFullYear() - 1, current.getMonth(), 1)
                        : new Date(current.getFullYear(), current.getMonth() - 1, 1)
                  ));
                }}
                aria-label={viewMode === 'years' ? 'Previous years' : viewMode === 'months' ? 'Previous year' : 'Previous month'}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('years')}
                className="rounded-full px-3 py-1.5 text-center transition hover:bg-[rgba(200,169,107,0.08)]"
              >
                <p className="text-sm font-semibold text-white">{headerLabel}</p>
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(200,169,107,0.18)] text-[#f4dfb2] transition hover:bg-[rgba(200,169,107,0.12)]"
                onClick={() => {
                  setViewDate((current) => (
                    viewMode === 'years'
                      ? new Date(current.getFullYear() + 12, current.getMonth(), 1)
                      : viewMode === 'months'
                        ? new Date(current.getFullYear() + 1, current.getMonth(), 1)
                        : new Date(current.getFullYear(), current.getMonth() + 1, 1)
                  ));
                }}
                aria-label={viewMode === 'years' ? 'Next years' : viewMode === 'months' ? 'Next year' : 'Next month'}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            {viewMode === 'years' ? (
              <div className="grid grid-cols-3 gap-2">
                {yearCells.map((year) => {
                  const isSelectedYear = selectedDate?.getFullYear() === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                        isSelectedYear
                          ? 'border-[#c8a96b] bg-[#c8a96b] text-[#002147] shadow-[0_10px_24px_rgba(200,169,107,0.24)]'
                          : 'border-[rgba(200,169,107,0.14)] bg-[rgba(255,255,255,0.03)] text-[#f7f3ea] hover:bg-[rgba(200,169,107,0.1)]'
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setViewDate((current) => new Date(year, current.getMonth(), 1));
                        setViewMode('months');
                      }}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            ) : viewMode === 'months' ? (
              <div className="grid grid-cols-3 gap-2">
                {monthLabels.map((month, index) => {
                  const isSelectedMonth =
                    selectedDate?.getFullYear() === viewDate.getFullYear() &&
                    selectedDate?.getMonth() === index;
                  return (
                    <button
                      key={month}
                      type="button"
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                        isSelectedMonth
                          ? 'border-[#c8a96b] bg-[#c8a96b] text-[#002147] shadow-[0_10px_24px_rgba(200,169,107,0.24)]'
                          : 'border-[rgba(200,169,107,0.14)] bg-[rgba(255,255,255,0.03)] text-[#f7f3ea] hover:bg-[rgba(200,169,107,0.1)]'
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setViewDate((current) => new Date(current.getFullYear(), index, 1));
                        setViewMode('days');
                      }}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8c919c]">
                  {weekdayLabels.map((day) => (
                    <span key={day} className="py-1">{day}</span>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1">
                  {calendarCells.map((cell) => {
                    const isSelected = isSameDate(cell.date, selectedDate);
                    const isToday = isSameDate(cell.date, new Date());
                    return (
                      <button
                        key={`${cell.date.toISOString()}-${cell.outside ? 'out' : 'in'}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          updateValue(cell.date);
                          setOpen(false);
                        }}
                        className={`flex h-10 items-center justify-center rounded-xl text-sm transition ${
                          cell.outside
                            ? 'text-[#5f6672] hover:bg-[rgba(255,255,255,0.04)]'
                            : 'text-[#f7f3ea] hover:bg-[rgba(200,169,107,0.12)]'
                        } ${isSelected ? 'bg-[#c8a96b] font-semibold text-[#002147] shadow-[0_10px_24px_rgba(200,169,107,0.28)]' : ''} ${isToday && !isSelected ? 'ring-1 ring-[#c8a96b]/60' : ''}`.trim()}
                      >
                        {cell.date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
