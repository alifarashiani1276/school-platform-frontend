import { useTranslation } from "react-i18next";

// Small presentational helpers shared by the parent pages (same card look as the
// admin and teacher panels).

export const STATUS_STYLE = {
  present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  absent: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  late: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
};

export function AttendanceBadge({ status }) {
  const { t } = useTranslation();
  const known = status in STATUS_STYLE;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
        known ? STATUS_STYLE[status] : "bg-muted text-muted-foreground"
      }`}
    >
      {known ? t(`teacher.class.${status}`) : status}
    </span>
  );
}

export function Card({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h2 className="flex min-w-0 items-center gap-2 text-lg font-black">
              {Icon && <Icon size={20} className="shrink-0 text-primary" aria-hidden="true" />}
              <span className="min-w-0 break-words">{title}</span>
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, text }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black sm:text-3xl">{title}</h1>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function EmptyBox({ children }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-muted/50 p-5 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted p-4">
      <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-2xl font-black text-foreground" dir="auto">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Title of a grade entry: a translated assessment key, or the teacher's own text.
export const gradeTitle = (grade, t) =>
  grade.titleKey
    ? t(`teacher.assessments.${grade.titleKey}`)
    : (grade.title ?? t("parent.grades.assessment"));

export const useNumberFormat = () => {
  const { i18n } = useTranslation();
  return (value, digits = 2) =>
    value == null || Number.isNaN(Number(value))
      ? "—"
      : Number(value).toLocaleString(i18n.language, { maximumFractionDigits: digits });
};

export const inputClass =
  "w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
