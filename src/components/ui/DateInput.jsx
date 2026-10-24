import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import jalaali from "jalaali-js";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isPersian, parseDate, todayIso } from "../../utils/dateFormat";

// Dates are always stored as Gregorian "YYYY-MM-DD" strings. In Persian the
// field shows (and picks) Shamsi dates; in every other language it is the
// browser's native date input, exactly as before.

const fieldClass =
  "w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

const pad = (n) => String(n).padStart(2, "0");
const toIso = ({ gy, gm, gd }) => `${gy}-${pad(gm)}-${pad(gd)}`;
const faNumber = new Intl.NumberFormat("fa-IR-u-nu-arabext", { useGrouping: false });
const faMonthName = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", { month: "long" });
const faWeekday = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", { weekday: "narrow" });

const jalaliOf = (iso) => {
  const date = parseDate(iso);
  return date ? jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate()) : null;
};

const monthName = (jy, jm) => faMonthName.format(new Date(toIso(jalaali.toGregorian(jy, jm, 1)) + "T12:00:00"));

// Saturday-first week header (2024-01-06 was a Saturday).
const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, i) => faWeekday.format(new Date(2024, 0, 6 + i)));

function JalaliCalendar({ id, value, min, max, onPick, onClose }) {
  const { t } = useTranslation();
  const today = todayIso();
  const start = jalaliOf(value) ?? jalaliOf(today);
  const [view, setView] = useState({ jy: start.jy, jm: start.jm });

  const move = (delta) =>
    setView(({ jy, jm }) => {
      const index = jy * 12 + (jm - 1) + delta;
      return { jy: Math.floor(index / 12), jm: (index % 12) + 1 };
    });

  const length = jalaali.jalaaliMonthLength(view.jy, view.jm);
  const firstGregorian = jalaali.toGregorian(view.jy, view.jm, 1);
  const offset = (new Date(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd).getDay() + 1) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length }, (_, i) => i + 1)];

  const outOfRange = (iso) => (min && iso < min) || (max && iso > max);
  const todayOk = !outOfRange(today);

  return (
    <div
      id={id}
      role="dialog"
      dir="rtl"
      aria-label={t("common.datePicker.select")}
      className="absolute top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-3 text-foreground shadow-xl [inset-inline-start:0]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label={t("common.datePicker.previousMonth")}
          className="grid h-9 w-9 place-items-center rounded-xl hover:bg-muted"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <span className="font-black">
          {monthName(view.jy, view.jm)} {faNumber.format(view.jy)}
        </span>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label={t("common.datePicker.nextMonth")}
          className="grid h-9 w-9 place-items-center rounded-xl hover:bg-muted"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="py-1">{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const iso = toIso(jalaali.toGregorian(view.jy, view.jm, day));
          const selected = iso === value;
          const disabled = outOfRange(iso);
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onPick(iso)}
              className={`grid h-9 place-items-center rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : iso === today
                    ? "border border-primary text-primary hover:bg-primary/10"
                    : "hover:bg-muted"
              }`}
            >
              {faNumber.format(day)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between gap-2">
        <button
          type="button"
          disabled={!todayOk}
          onClick={() => onPick(today)}
          className="rounded-xl px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary/10 disabled:opacity-40"
        >
          {t("common.datePicker.today")}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-muted">
          {t("common.datePicker.close")}
        </button>
      </div>
    </div>
  );
}

function PersianDateField({ id, value, min, max, onChange, hasError, className, ...rest }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const popoverId = `${id}-calendar`;

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const jalali = jalaliOf(value);
  const display = jalali ? `${faNumber.format(jalali.jy)}/${faNumber.format(jalali.jm).padStart(2, "۰")}/${faNumber.format(jalali.jd).padStart(2, "۰")}` : "";

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-invalid={hasError ? true : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`${fieldClass} flex items-center justify-between gap-3 text-start ${
          hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
        } ${className}`}
        {...rest}
      >
        <span className={display ? "" : "text-muted-foreground"}>
          {display || t("common.datePicker.select")}
        </span>
        <CalendarDays size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {open && (
        <JalaliCalendar
          id={popoverId}
          value={value}
          min={min}
          max={max}
          onClose={() => setOpen(false)}
          onPick={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function DateInput({ label, error, value = "", onChange, min, max, className = "", id: idProp, ...rest }) {
  const { i18n } = useTranslation();
  const autoId = useId();
  const id = idProp || autoId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-foreground">
          {label}
        </label>
      )}
      {isPersian(i18n.language) ? (
        <PersianDateField id={id} value={value} min={min} max={max} onChange={onChange} hasError={Boolean(error)} className={className} {...rest} />
      ) : (
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${fieldClass} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
          {...rest}
        />
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
