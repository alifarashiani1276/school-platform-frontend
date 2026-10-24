import {
  AlertTriangle,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  MessageSquare,
  Radio,
  Star,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useOutletContext } from "react-router-dom";
import {
  AttendanceBadge,
  Card,
  EmptyBox,
  StatCard,
  gradeTitle,
  useNumberFormat,
} from "../../components/parent/ParentUi";
import {
  assignmentCompletionSummary,
  overallGradeAverage,
  summarizeAttendance,
} from "../../services/parentService";
import { formatDate, todayIso } from "../../utils/dateFormat";

const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));

export default function ParentDashboard() {
  const { t, i18n } = useTranslation();
  const { child } = useOutletContext();
  const num = useNumberFormat();
  const today = todayIso();

  const attendance = summarizeAttendance(child.attendance);
  const overallAverage = overallGradeAverage(child.grades);
  const assignmentSummary = assignmentCompletionSummary(
    child.assignments,
    today,
  );
  const firstRank = child.ranks[0];
  const openAssignments = child.assignments
    .filter((a) => a.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = child.assignments.filter((a) => a.dueDate < today);
  const latestAttendance = [...child.attendance].sort(byDateDesc);
  const recentGrades = [...child.grades].sort(byDateDesc).slice(0, 4);
  const liveClass = child.onlineClasses.filter((s) => s.live);
  const liveExam = child.onlineExams.filter((s) => s.live);
  const importantAlerts = [...(child.importantAlerts ?? [])].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
  );

  // Important items, derived only from real records of this child.
  const alerts = [
    ...importantAlerts.map((alert) => ({
      id: `teacher-alert-${alert.id}`,
      icon: AlertTriangle,
      text: alert.text,
      link: null,
      to: "/parent",
    })),
    ...liveClass.map((s) => ({
      id: `oc-${s.classId}`,
      icon: Radio,
      text: t("parent.alerts.liveClass", { title: s.title }),
      link: s.link,
    })),
    ...liveExam.map((s) => ({
      id: `oe-${s.classId}`,
      icon: Radio,
      text: t("parent.alerts.liveExam", { title: s.title }),
      link: s.link,
    })),
    ...openAssignments
      .filter((a) => a.dueDate === today)
      .map((a) => ({
        id: `due-${a.id}`,
        icon: ClipboardList,
        text: t("parent.alerts.dueToday", { title: a.title }),
        to: "/parent/assignments",
      })),
    ...(overdue.length
      ? [
          {
            id: "overdue",
            icon: AlertTriangle,
            text: t("parent.alerts.overdue", { count: overdue.length }),
            to: "/parent/assignments",
          },
        ]
      : []),
    ...(latestAttendance[0]?.status === "absent"
      ? [
          {
            id: "absent",
            icon: CalendarCheck,
            text: t("parent.alerts.lastAbsent", {
              date: formatDate(latestAttendance[0].date, i18n.language),
            }),
            to: "/parent/attendance",
          },
        ]
      : []),
  ];

  const quick = [
    { to: "/parent/schedule", icon: CalendarRange, key: "schedule" },
    { to: "/parent/attendance", icon: CalendarCheck, key: "attendance" },
    { to: "/parent/grades", icon: Star, key: "grades" },
    { to: "/parent/assignments", icon: ClipboardList, key: "assignments" },
    { to: "/parent/messages", icon: MessageSquare, key: "messages" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <GraduationCap
            className="h-9 w-9 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {t("parent.yourChild")}
            </p>
            <h1 className="break-words text-2xl font-black" dir="auto">
              {child.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground" dir="auto">
              {child.classes.map((c) => c.name).join(" · ") ||
                t("parent.noClass")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Star}
            label={t("parent.avgGrade")}
            value={overallAverage == null ? "—" : num(overallAverage)}
          />
          <StatCard
            icon={CalendarCheck}
            label={t("parent.attendance")}
            value={
              attendance.rate == null ? "—" : `${num(attendance.rate, 0)}%`
            }
            hint={
              attendance.total
                ? t("parent.attendanceHint", { count: attendance.total })
                : undefined
            }
          />
          <StatCard
            icon={TrendingUp}
            label={t("parent.classRank")}
            value={firstRank ? `${num(firstRank.rank, 0)}` : "—"}
            hint={
              firstRank
                ? t("parent.rankOf", { count: firstRank.size })
                : undefined
            }
          />
          <StatCard
            icon={ClipboardList}
            label={t("parent.openAssignments")}
            value={
              assignmentSummary.rate == null
                ? "—"
                : `${num(assignmentSummary.rate, 0)}%`
            }
            hint={
              assignmentSummary.total
                ? t("parent.assignmentProgressHint", {
                    count: assignmentSummary.total,
                  })
                : undefined
            }
          />
        </div>
      </Card>

      <Card title={t("parent.importantTitle")} icon={AlertTriangle}>
        {alerts.length === 0 ? (
          <EmptyBox>{t("parent.noAlerts")}</EmptyBox>
        ) : (
          <ul className="space-y-2">
            {alerts.map(({ id, icon: Icon, text, link, to }) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <span
                  className="flex min-w-0 items-center gap-2 text-sm font-bold"
                  dir="auto"
                >
                  <Icon
                    size={18}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {text}
                </span>
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    {t("parent.join")}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ) : (
                  <Link
                    to={to}
                    className="text-xs font-bold text-primary underline-offset-2 hover:underline"
                  >
                    {t("parent.view")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("parent.recentGrades")} icon={Star}>
          {recentGrades.length === 0 ? (
            <EmptyBox>{t("parent.grades.empty")}</EmptyBox>
          ) : (
            <ul className="space-y-2">
              {recentGrades.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold" dir="auto">
                      {g.subject} — {gradeTitle(g, t)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(g.date, i18n.language)}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-black" dir="ltr">
                    {num(g.score)} / {num(g.max, 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("parent.recentAttendance")} icon={CalendarCheck}>
          {latestAttendance.length === 0 ? (
            <EmptyBox>{t("parent.attendanceEmpty")}</EmptyBox>
          ) : (
            <ul className="space-y-2">
              {latestAttendance.slice(0, 4).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold" dir="auto">
                      {r.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.date, i18n.language)}
                    </p>
                  </div>
                  <AttendanceBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={t("parent.upcomingAssignments")} icon={ClipboardList}>
        {openAssignments.length === 0 ? (
          <EmptyBox>{t("parent.assignments.empty")}</EmptyBox>
        ) : (
          <ul className="space-y-2">
            {openAssignments.slice(0, 3).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <p className="min-w-0 break-words text-sm font-bold" dir="auto">
                  {a.title}
                  {a.subject ? ` — ${a.subject}` : ""}
                </p>
                <span className="text-xs text-muted-foreground">
                  {t("teacher.assignments.dueOn", {
                    date: formatDate(a.dueDate, i18n.language),
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t("parent.quickAccess")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quick.map(({ to, icon: Icon, key }) => (
            <Link
              key={key}
              to={to}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted p-4 text-center text-sm font-bold transition hover:border-primary hover:text-primary"
            >
              <Icon size={22} className="text-primary" aria-hidden="true" />
              {t(`parent.nav.${key}`)}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
