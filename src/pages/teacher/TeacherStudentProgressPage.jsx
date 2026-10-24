import { ArrowLeft, Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import { useTeacherClasses } from "../../data/teacherStore";
import { compareStudent, defaultRanges, lessonsOfStudent, round2, validateRanges } from "../../utils/studentProgress";
import DateInput from "../../components/ui/DateInput";
import TeacherEmptyState from "../../components/teacher/TeacherEmptyState";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";

const MAX_SCORE = 20;

const TREND = {
  up: { icon: TrendingUp, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  down: { icon: TrendingDown, cls: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
  same: { icon: Minus, cls: "bg-muted text-muted-foreground" },
};

const trendOf = (change) => {
  if (change === null || change === undefined) return null;
  const r = round2(change);
  return r > 0 ? "up" : r < 0 ? "down" : "same";
};


function RangePicker({ title, value, onChange }) {
  const { t } = useTranslation();
  const id = title.replace(/\s+/g, "-");
  return (
    <fieldset className="rounded-2xl border border-border bg-muted p-4">
      <legend className="px-2 text-sm font-black text-foreground">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-from`} className="mb-1 block text-xs font-bold text-muted-foreground">
            {t("teacher.progress.from")}
          </label>
          <DateInput id={`${id}-from`} value={value.from} onChange={(v) => onChange({ ...value, from: v })} />
        </div>
        <div>
          <label htmlFor={`${id}-to`} className="mb-1 block text-xs font-bold text-muted-foreground">
            {t("teacher.progress.to")}
          </label>
          <DateInput id={`${id}-to`} value={value.to} onChange={(v) => onChange({ ...value, to: v })} />
        </div>
      </div>
    </fieldset>
  );
}

export default function TeacherStudentProgressPage() {
  const { t, i18n } = useTranslation();
  const { classId, studentId } = useParams();
  const navigate = useNavigate();
  const { getClass } = useTeacherClasses();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const classData = getClass(classId);
  const student = classData?.students.find((s) => s.id === studentId);

  const [ranges, setRanges] = useState(() => defaultRanges(lessonsOfStudent(classData, studentId)));

  const shell = (content) => (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <TeacherTopbar teacher={mockTeacher} onToggleMobileMenu={() => setMobileOpen((v) => !v)} />
        {content}
      </div>
    </div>
  );

  if (!classData || !student) {
    return shell(
      <main className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <TeacherEmptyState
          title={t("teacher.class.studentNotFound")}
          description=""
          actionLabel={t("teacher.class.backToClass")}
          onAction={() => navigate(classData ? `/teacher/class/${classData.id}` : "/teacher")}
        />
      </main>,
    );
  }

  const nf = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const signed = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" });
  const pctFormat = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 1 });
  const num = (n) => (n === null || n === undefined ? t("teacher.progress.noData") : nf.format(round2(n)));
  const ltr = (text) => <bdi dir="ltr">{text}</bdi>;

  const hasExams = lessonsOfStudent(classData, studentId).some((l) => (l.gradeBook ?? []).length > 0);
  const errorKey = validateRanges(ranges.old, ranges.new);
  const result = hasExams && !errorKey ? compareStudent(classData, studentId, ranges.old, ranges.new) : null;
  const trend = result ? trendOf(result.overall.change) : null;

  const summary = (() => {
    if (!result) return "";
    const { change, percent } = result.overall;
    if (change === null) return t("teacher.progress.summaryNoData");
    const values = {
      name: student.name,
      value: nf.format(Math.abs(round2(change))),
      percent: percent === null ? "-" : pctFormat.format(Math.abs(percent)),
    };
    return t(`teacher.progress.summary.${trend}`, values);
  })();

  const bars = result
    ? [
        { key: "barOld", value: result.overall.oldAvg, cls: "bg-primary/40" },
        { key: "barNew", value: result.overall.newAvg, cls: "bg-primary" },
        { key: "barTop", value: result.top?.avg ?? null, cls: "bg-amber-400" },
      ]
    : [];

  const card = "rounded-2xl border border-border bg-card p-5 shadow-sm";

  return shell(
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Link
        to={`/teacher/class/${classData.id}#students`}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
      >
        <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden="true" />
        {t("teacher.class.backToClass")}
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <TrendingUp size={28} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-foreground">{t("teacher.progress.title")}</h1>
          <p className="mt-1 break-words text-lg font-black text-primary" dir="auto">{student.name}</p>
          <p className="break-words text-sm text-muted-foreground" dir="auto">{classData.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("teacher.progress.subtitle")}</p>
        </div>
      </div>

      {!hasExams ? (
        <TeacherEmptyState
          title={t("teacher.progress.noExamsTitle")}
          description={t("teacher.progress.noExamsText")}
          actionLabel={t("teacher.class.backToClass")}
          onAction={() => navigate(`/teacher/class/${classData.id}`)}
        />
      ) : (
        <>
          <section className={`mt-6 ${card}`}>
            <h2 className="text-lg font-black text-foreground">{t("teacher.progress.periodsTitle")}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <RangePicker title={t("teacher.progress.oldPeriod")} value={ranges.old} onChange={(v) => setRanges((r) => ({ ...r, old: v }))} />
              <RangePicker title={t("teacher.progress.newPeriod")} value={ranges.new} onChange={(v) => setRanges((r) => ({ ...r, new: v }))} />
            </div>
            {errorKey && (
              <p role="alert" className="mt-3 text-sm font-bold text-red-600 dark:text-red-400">
                {t(`teacher.progress.errors.${errorKey}`)}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t("teacher.progress.scaleNote", { max: nf.format(MAX_SCORE) })}</p>
          </section>

          {result && (
            <>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className={card}>
                  <p className="text-sm font-bold text-muted-foreground">{t("teacher.progress.oldAverage")}</p>
                  <p className="mt-2 text-3xl font-black text-foreground">{num(result.overall.oldAvg)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("teacher.progress.examCount", { count: result.overall.oldCount })}</p>
                </div>
                <div className={card}>
                  <p className="text-sm font-bold text-muted-foreground">{t("teacher.progress.newAverage")}</p>
                  <p className="mt-2 text-3xl font-black text-foreground">{num(result.overall.newAvg)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("teacher.progress.examCount", { count: result.overall.newCount })}</p>
                </div>
                <div className={card}>
                  <p className="text-sm font-bold text-muted-foreground">{t("teacher.progress.change")}</p>
                  {trend ? (
                    <>
                      <p className="mt-2 text-3xl font-black text-foreground">{ltr(signed.format(round2(result.overall.change)))}</p>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${TREND[trend].cls}`}>
                        {(() => {
                          const Icon = TREND[trend].icon;
                          return <Icon size={14} aria-hidden="true" />;
                        })()}
                        {t(`teacher.progress.trend.${trend}`)}
                        {result.overall.percent !== null && <> · {ltr(pctFormat.format(Math.abs(result.overall.percent)))}</>}
                      </span>
                    </>
                  ) : (
                    <p className="mt-2 text-lg font-black text-muted-foreground">{t("teacher.progress.noData")}</p>
                  )}
                </div>
                <div className={card}>
                  <p className="text-sm font-bold text-muted-foreground">{t("teacher.progress.gapToTop")}</p>
                  {result.gap === null ? (
                    <p className="mt-2 text-lg font-black text-muted-foreground">{t("teacher.progress.noData")}</p>
                  ) : (
                    <p className="mt-2 text-3xl font-black text-foreground">{result.isTop ? nf.format(0) : num(result.gap)}</p>
                  )}
                </div>
              </section>

              <p className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-bold text-foreground" dir="auto">{summary}</p>

              <section className={`mt-6 ${card}`}>
                <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
                  <Trophy size={18} className="text-amber-500" aria-hidden="true" />
                  {t("teacher.progress.topTitle")}
                </h2>
                {!result.top ? (
                  <p className="mt-3 text-sm text-muted-foreground">{t("teacher.progress.noData")}</p>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-muted-foreground" dir="auto">
                      {t("teacher.progress.topInfo", { name: result.top.name, avg: nf.format(round2(result.top.avg)) })}
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground" dir="auto">
                      {result.gap === null
                        ? t("teacher.progress.noData")
                        : result.isTop
                          ? t("teacher.progress.youAreTop", { name: student.name })
                          : t("teacher.progress.gapText", { name: student.name, gap: nf.format(round2(result.gap)) })}
                    </p>
                  </>
                )}

                <ul className="mt-5 space-y-3">
                  {bars.map((bar) => (
                    <li key={bar.key} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm font-bold text-foreground sm:w-40">{t(`teacher.progress.${bar.key}`)}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <div
                          className={`h-full rounded-full ${bar.cls}`}
                          style={{ width: `${bar.value === null ? 0 : Math.min(100, (bar.value / MAX_SCORE) * 100)}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-end text-sm font-black text-foreground">{num(bar.value)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <h2 className="border-b border-border bg-muted/50 px-5 py-4 text-lg font-black text-foreground">
                  {t("teacher.progress.lessonsTitle")}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-start">
                    <thead>
                      <tr className="border-b border-border text-sm text-muted-foreground">
                        {["colLesson", "colOld", "colNew", "colChange", "colTop", "colGap"].map((key) => (
                          <th key={key} scope="col" className="px-4 py-3 text-start font-bold">{t(`teacher.progress.${key}`)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.rows.map((row) => {
                        const rowTrend = trendOf(row.change);
                        const Icon = rowTrend ? TREND[rowTrend].icon : null;
                        return (
                          <tr key={row.id}>
                            <th scope="row" className="px-4 py-3 text-start font-black text-foreground" dir="auto">{row.title}</th>
                            <td className="px-4 py-3 font-bold text-foreground">{num(row.oldAvg)}</td>
                            <td className="px-4 py-3 font-bold text-foreground">{num(row.newAvg)}</td>
                            <td className="px-4 py-3">
                              {rowTrend ? (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${TREND[rowTrend].cls}`}>
                                  <Icon size={14} aria-hidden="true" />
                                  {ltr(signed.format(round2(row.change)))}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">{t("teacher.progress.noData")}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground" dir="auto">
                              {row.top ? `${row.top.name} (${nf.format(round2(row.top.avg))})` : t("teacher.progress.noData")}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-foreground">
                              {row.gap === null ? t("teacher.progress.noData") : row.isTop ? t("teacher.progress.lessonTop") : nf.format(round2(row.gap))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </main>,
  );
}
