import {
  AlertTriangle,
  BookOpen,
  CalendarX2,
  ChevronDown,
  Clock,
  GraduationCap,
  LayoutDashboard,
  Trophy,
  UserX,
  Users,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import GRADE_SCALE from "../../config/gradeScale";
import { mockTeacher } from "../../data/mockTeacherData";
import { useClassAttendance } from "../../data/classAttendanceStore";
import { useTeacherClasses } from "../../data/teacherStore";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import { todayIso } from "../../utils/dateFormat";
import { buildClassRanking, round2 } from "../../utils/studentProgress";

const mean = (list) =>
  list.length ? list.reduce((sum, n) => sum + n, 0) / list.length : null;

// Absence-days that are at or above this number put a student on the
// "needs attention" list, next to a grade average under the pass mark.
const ABSENCE_ALERT_DAYS = 3;

function StatCard({ icon: Icon, label, value, hint, tone = "primary" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    danger: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 break-words text-3xl font-black text-foreground" dir="auto">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={18} className="text-primary" aria-hidden="true" />
        <h2 className="text-lg font-black text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// Local accordion for this page: the panel stays mounted and animates its
// height (grid-rows 0fr -> 1fr), so opening it never makes the page jump.
function AccordionItem({ open, onToggle, title, meta, children }) {
  const uid = useId();
  const panelId = `${uid}-panel`;

  return (
    <div
      className={`rounded-2xl border bg-card shadow-sm transition-colors duration-300 ${
        open ? "border-primary/40" : "border-border"
      }`}
    >
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-start transition-colors hover:bg-muted/60"
        >
          <span className="min-w-0 break-words text-lg font-black text-foreground" dir="auto">
            {title}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
              {meta}
            </span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`text-primary transition-transform duration-300 motion-reduce:transition-none ${
                open ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-hidden={!open}
        inert={open ? undefined : ""}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div
          className={`min-h-0 overflow-hidden transition-[visibility] duration-300 ${
            open ? "visible" : "invisible"
          }`}
        >
          <div className="border-t border-border p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyLine({ children }) {
  return (
    <p className="rounded-xl bg-muted p-3 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export default function TeacherOverviewPage() {
  const { t, i18n } = useTranslation();
  const { activeClasses } = useTeacherClasses();
  const { all: attendanceByClass } = useClassAttendance();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Each accordion opens and closes on its own: a map of key -> open.
  const [openKeys, setOpenKeys] = useState({});
  const toggle = (key) =>
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  const formatNumber = (value) =>
    value == null
      ? "—"
      : Number(value).toLocaleString(i18n.language, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        });

  const overview = useMemo(() => {
    const today = todayIso();
    const rows = [];

    activeClasses.forEach((cls) => {
      const averages = new Map(
        buildClassRanking(cls).map((row) => [row.id, row.average]),
      );
      const classDays = attendanceByClass[cls.id] ?? {};

      (cls.students ?? []).forEach((student) => {
        // Today's saved class attendance wins; without it, the roster status.
        const todayStatus =
          classDays[today]?.[student.id] ?? student.status ?? "present";
        const absenceDays = Object.values(classDays).filter(
          (day) => day?.[student.id] === "absent",
        ).length;

        rows.push({
          key: `${cls.id}:${student.id}`,
          studentId: student.id,
          name: student.name,
          classId: cls.id,
          className: cls.name,
          todayStatus,
          absenceDays,
          average: averages.get(student.id) ?? null,
        });
      });
    });

    const absentToday = rows.filter((row) => row.todayStatus === "absent");
    const lateToday = rows.filter((row) => row.todayStatus === "late");
    const gradedRows = rows.filter((row) => row.average !== null);

    const needAttention = rows
      .map((row) => {
        const reasons = [];
        if (row.average !== null && row.average < GRADE_SCALE.passMark) {
          reasons.push("lowGrade");
        }
        if (row.absenceDays >= ABSENCE_ALERT_DAYS) reasons.push("absences");
        return { ...row, reasons };
      })
      .filter((row) => row.reasons.length > 0)
      .sort((a, b) => b.reasons.length - a.reasons.length);

    const lessonRates = activeClasses.flatMap((cls) =>
      (cls.lessons ?? []).map((lesson) => Number(lesson.attendanceRate)),
    ).filter((value) => Number.isFinite(value));

    const classSummaries = activeClasses.map((cls) => {
      const classRows = rows.filter((row) => row.classId === cls.id);
      const classRates = (cls.lessons ?? [])
        .map((lesson) => Number(lesson.attendanceRate))
        .filter((value) => Number.isFinite(value));
      const classAverages = classRows
        .map((row) => row.average)
        .filter((value) => value !== null);

      return {
        id: cls.id,
        name: cls.name,
        students: classRows.length,
        absentToday: classRows.filter((row) => row.todayStatus === "absent").length,
        attendance: classRates.length ? Math.round(mean(classRates)) : null,
        average: classAverages.length ? round2(mean(classAverages)) : null,
      };
    });

    return {
      uniqueStudents: new Set(rows.map((row) => row.studentId)).size,
      lessons: activeClasses.reduce((sum, cls) => sum + (cls.lessons?.length ?? 0), 0),
      absentToday,
      lateToday,
      totalAbsenceDays: rows.reduce((sum, row) => sum + row.absenceDays, 0),
      averageGrade: gradedRows.length
        ? round2(mean(gradedRows.map((row) => row.average)))
        : null,
      attendanceRate: lessonRates.length ? Math.round(mean(lessonRates)) : null,
      needAttention,
      top: [...gradedRows].sort((a, b) => b.average - a.average).slice(0, 5),
      classSummaries,
    };
  }, [activeClasses, attendanceByClass]);

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <TeacherTopbar
          teacher={mockTeacher}
          onToggleMobileMenu={() => setMobileOpen((v) => !v)}
        />

        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <LayoutDashboard size={24} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-3xl font-black text-foreground">
                {t("teacher.overview.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("teacher.overview.subtitle")}
              </p>
            </div>
          </div>

          {activeClasses.length === 0 ? (
            <div className="mt-8">
              <EmptyLine>{t("teacher.overview.noClasses")}</EmptyLine>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Users}
                  label={t("teacher.overview.totalStudents")}
                  value={overview.uniqueStudents}
                />
                <StatCard
                  icon={BookOpen}
                  label={t("teacher.overview.activeClasses")}
                  value={activeClasses.length}
                  hint={t("teacher.overview.lessonsHint", { count: overview.lessons })}
                />
                <StatCard
                  icon={UserX}
                  tone="danger"
                  label={t("teacher.overview.absentToday")}
                  value={overview.absentToday.length}
                  hint={t("teacher.overview.totalAbsenceDays", {
                    count: overview.totalAbsenceDays,
                  })}
                />
                <StatCard
                  icon={Clock}
                  tone="warning"
                  label={t("teacher.overview.lateToday")}
                  value={overview.lateToday.length}
                />
                <StatCard
                  icon={GraduationCap}
                  label={t("teacher.overview.averageGrade")}
                  value={formatNumber(overview.averageGrade)}
                  hint={t("teacher.overview.outOf", { max: GRADE_SCALE.max })}
                />
                <StatCard
                  icon={CalendarX2}
                  label={t("teacher.overview.attendanceRate")}
                  value={
                    overview.attendanceRate == null ? "—" : `${overview.attendanceRate}%`
                  }
                />
                <StatCard
                  icon={AlertTriangle}
                  tone="warning"
                  label={t("teacher.overview.needAttentionCount")}
                  value={overview.needAttention.length}
                />
                <StatCard
                  icon={Trophy}
                  label={t("teacher.overview.topStudent")}
                  value={overview.top[0]?.name ?? "—"}
                  hint={
                    overview.top[0] ? formatNumber(overview.top[0].average) : undefined
                  }
                />
              </div>

              <div className="mt-6 space-y-4">

                <Panel icon={AlertTriangle} title={t("teacher.overview.attentionTitle")}>
                  {overview.needAttention.length === 0 ? (
                    <EmptyLine>{t("teacher.overview.noAttention")}</EmptyLine>
                  ) : (
                    <ul className="space-y-2">
                      {overview.needAttention.map((row) => (
                        <li key={row.key}>
                          <Link
                            to={`/teacher/class/${row.classId}/student/${row.studentId}/progress`}
                            className="block rounded-xl border border-border bg-muted px-3 py-2 transition hover:border-primary"
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="min-w-0 break-words font-bold text-foreground" dir="auto">
                                {row.name}
                              </span>
                              <span className="shrink-0 text-xs font-bold text-muted-foreground" dir="auto">
                                {row.className}
                              </span>
                            </span>
                            <span className="mt-1 flex flex-wrap gap-2">
                              {row.reasons.includes("lowGrade") && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                  {t("teacher.dashboard.alerts.lowGrade", {
                                    passMark: GRADE_SCALE.passMark,
                                    value: formatNumber(row.average),
                                  })}
                                </span>
                              )}
                              {row.reasons.includes("absences") && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                                  {t("teacher.dashboard.alerts.absent", {
                                    count: row.absenceDays,
                                  })}
                                </span>
                              )}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <AccordionItem
                  open={Boolean(openKeys.absent)}
                  onToggle={() => toggle("absent")}
                  title={t("teacher.overview.absenteesTitle")}
                  meta={overview.absentToday.length}
                >
                  {overview.absentToday.length === 0 ? (
                    <EmptyLine>{t("teacher.overview.noAbsentees")}</EmptyLine>
                  ) : (
                    <ul className="space-y-2">
                      {overview.absentToday.map((row) => (
                        <li key={row.key}>
                          <Link
                            to={`/teacher/class/${row.classId}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-3 py-2 transition hover:border-primary"
                          >
                            <span className="min-w-0 break-words font-bold text-foreground" dir="auto">
                              {row.name}
                            </span>
                            <span className="shrink-0 text-xs font-bold text-muted-foreground" dir="auto">
                              {row.className}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </AccordionItem>

                <AccordionItem
                  open={Boolean(openKeys.top)}
                  onToggle={() => toggle("top")}
                  title={t("teacher.overview.topTitle")}
                  meta={overview.top.length}
                >
                  {overview.top.length === 0 ? (
                    <EmptyLine>{t("teacher.ranking.empty")}</EmptyLine>
                  ) : (
                    <ol className="space-y-2">
                      {overview.top.map((row, index) => (
                        <li
                          key={row.key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="font-black text-primary">#{index + 1}</span>
                            <span className="min-w-0 break-words font-bold text-foreground" dir="auto">
                              {row.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground" dir="auto">
                              {row.className}
                            </span>
                          </span>
                          <span className="shrink-0 font-black text-foreground">
                            {formatNumber(row.average)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </AccordionItem>

                <AccordionItem
                  open={Boolean(openKeys.classes)}
                  onToggle={() => toggle("classes")}
                  title={t("teacher.overview.classesTitle")}
                  meta={overview.classSummaries.length}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="text-foreground">
                        <tr>
                          <th className="border-b border-border px-2 py-2 text-start font-black">
                            {t("teacher.overview.colClass")}
                          </th>
                          <th className="border-b border-border px-2 py-2 text-start font-black">
                            {t("teacher.overview.colStudents")}
                          </th>
                          <th className="border-b border-border px-2 py-2 text-start font-black">
                            {t("teacher.overview.colAbsent")}
                          </th>
                          <th className="border-b border-border px-2 py-2 text-start font-black">
                            {t("teacher.overview.colAttendance")}
                          </th>
                          <th className="border-b border-border px-2 py-2 text-start font-black">
                            {t("teacher.overview.colAverage")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.classSummaries.map((row) => (
                          <tr key={row.id}>
                            <td className="border-b border-border px-2 py-2 font-bold">
                              <Link
                                to={`/teacher/class/${row.id}`}
                                className="text-primary hover:underline"
                                dir="auto"
                              >
                                {row.name}
                              </Link>
                            </td>
                            <td className="border-b border-border px-2 py-2">{row.students}</td>
                            <td className="border-b border-border px-2 py-2">{row.absentToday}</td>
                            <td className="border-b border-border px-2 py-2">
                              {row.attendance == null ? "—" : `${row.attendance}%`}
                            </td>
                            <td className="border-b border-border px-2 py-2 font-black">
                              {formatNumber(row.average)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionItem>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
