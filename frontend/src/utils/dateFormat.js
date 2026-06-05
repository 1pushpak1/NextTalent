const MM_DD_YYYY_REGEX = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

const pad2 = (value) => String(value).padStart(2, '0');

const parseDateValue = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value || '').trim();
  if (!raw) return null;

  if (MM_DD_YYYY_REGEX.test(raw)) {
    const [month, day, year] = raw.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatMMDDYYYY = (value) => {
  const date = parseDateValue(value);
  if (!date) return '';
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}`;
};

const normalizeMMDDYYYYInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const isValidMMDDYYYY = (value) => {
  if (!MM_DD_YYYY_REGEX.test(String(value || '').trim())) return false;
  return Boolean(parseDateValue(value));
};

const capitalizeFirstLetter = (value) => {
  const text = String(value ?? '');
  return text.replace(/^(\s*)([a-z])/, (_, leading, letter) => `${leading}${letter.toUpperCase()}`);
};

const formatDisplayDate = (value) => formatMMDDYYYY(value) || String(value || '').trim();

export {
  MM_DD_YYYY_REGEX,
  capitalizeFirstLetter,
  formatDisplayDate,
  formatMMDDYYYY,
  isValidMMDDYYYY,
  normalizeMMDDYYYYInput,
  parseDateValue,
};
