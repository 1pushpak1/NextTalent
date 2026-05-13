const Counter = require('../models/Counter');

const pad = (value, size = 6) => String(value).padStart(size, '0');
const dateStamp = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

const nextCounter = async (key) => {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.value;
};

const nextInvoiceNumber = async () => {
  const stamp = dateStamp();
  const sequence = await nextCounter(`invoice:${stamp}`);
  return `NST-INV-${stamp}-${pad(sequence)}`;
};

const nextReceiptNumber = async () => {
  const stamp = dateStamp();
  const sequence = await nextCounter(`receipt:${stamp}`);
  return `NST-RCPT-${stamp}-${pad(sequence)}`;
};

const nextConsentId = async () => {
  const stamp = dateStamp();
  const sequence = await nextCounter(`consent:${stamp}`);
  return `NST-CONSENT-${stamp}-${pad(sequence)}`;
};

const nextPdfReference = async (prefix = 'PDF') => {
  const stamp = dateStamp();
  const sequence = await nextCounter(`pdf:${prefix.toLowerCase()}:${stamp}`);
  return `NST-${prefix}-${stamp}-${pad(sequence)}`;
};

module.exports = {
  nextInvoiceNumber,
  nextReceiptNumber,
  nextConsentId,
  nextPdfReference,
};
