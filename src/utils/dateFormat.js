// One place for every date shown in the app.
// Persian (fa) → Solar Hijri (Shamsi) calendar with Persian digits.
// Every other language keeps the previous Gregorian formatting.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isPersian = (lang) => String(lang ?? "").toLowerCase().startsWith("fa");

const intlLocale = (lang) => (isPersian(lang) ? "fa-IR-u-ca-persian-nu-arabext" : lang);

// "YYYY-MM-DD" is read as a local calendar day (no timezone shift).
export const parseDate = (value) => {
  if (!value) return null;
  const text = String(value);
  const date = ISO_DATE.test(text) ? new Date(`${text}T00:00:00`) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDate(value, lang, options = { dateStyle: "medium" }) {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "-";
  try {
    return new Intl.DateTimeFormat(intlLocale(lang), options).format(date);
  } catch {
    return String(value);
  }
}

export const formatDateTime = (value, lang) =>
  formatDate(value, lang, { dateStyle: "medium", timeStyle: "short" });

// Today as a local "YYYY-MM-DD" string (the format dates are stored in).
export const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
