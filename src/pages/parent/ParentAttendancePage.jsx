import { CalendarCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import {
  AttendanceBadge,
  Card,
  EmptyBox,
  PageTitle,
  StatCard,
  useNumberFormat,
} from "../../components/parent/ParentUi";
import DateInput from "../../components/ui/DateInput";
import Select from "../../components/ui/Select";
import { summarizeAttendance } from "../../services/parentService";
import { formatDate, todayIso } from "../../utils/dateFormat";

export default function ParentAttendancePage() {
  const { t, i18n } = useTranslation();
  const { child } = useOutletContext();
  const num = useNumberFormat();
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const subjects = useMemo(
    () => [...new Set(child.attendance.map((r) => r.subject).filter(Boolean))],
    [child],
  );

  const records = useMemo(
    () =>
      child.attendance
        .filter(
          (r) =>
            (!subject || r.subject === subject) &&
            (!from || r.date >= from) &&
            (!to || r.date <= to),
        )
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [child, subject, from, to],
  );
  const summary = summarizeAttendance(records);
  const today = todayIso();
  const totalSessions = useMemo(
    () =>
      new Set((child.attendance ?? []).map((r) => r.date).filter(Boolean)).size,
    [child.attendance],
  );
  const todayRecords = useMemo(
    () => (child.attendance ?? []).filter((r) => r.date === today),
    [child.attendance, today],
  );
  const todayStatus = useMemo(() => {
    if (!todayRecords.length) return null;
    if (todayRecords.some((r) => r.status === "present")) return "present";
    if (todayRecords.some((r) => r.status === "late")) return "late";
    if (todayRecords.some((r) => r.status === "absent")) return "absent";
    return null;
  }, [todayRecords]);
  const sessionHint =
    totalSessions > 0
      ? t("parent.attendancePage.sessionsHeld", { count: totalSessions })
      : t("parent.attendancePage.noSessionsHeld");

  return (
    <div className="space-y-6">
      <PageTitle
        title={t("parent.attendancePage.title")}
        text={t("parent.attendancePage.text")}
      />

      <Card title={t("parent.attendancePage.todayStatus")} icon={CalendarCheck}>
        {todayStatus ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("parent.attendancePage.todayStatusText", {
                  date: formatDate(today, i18n.language),
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AttendanceBadge status={todayStatus} />
              <span className="text-sm font-bold text-foreground">
                {t(`teacher.class.${todayStatus}`)}
              </span>
            </div>
          </div>
        ) : (
          <EmptyBox>{t("parent.attendancePage.noTodayRecord")}</EmptyBox>
        )}
      </Card>

      <div className="rounded-2xl border border-border bg-muted/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-muted-foreground">
            {t("parent.attendancePage.sessionsHeldLabel")}
          </p>
          <span className="text-2xl font-black text-foreground">
            {totalSessions}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={CalendarCheck}
          label={t("teacher.class.present")}
          value={num(summary.present, 0)}
        />
        <StatCard
          icon={CalendarCheck}
          label={t("teacher.class.absent")}
          value={num(summary.absent, 0)}
        />
        <StatCard
          icon={CalendarCheck}
          label={t("teacher.class.late")}
          value={num(summary.late, 0)}
        />
        <StatCard
          icon={CalendarCheck}
          label={t("parent.attendanceRate")}
          value={summary.rate == null ? "—" : `${num(summary.rate, 0)}%`}
        />
      </div>

      <Card title={t("parent.filters")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label={t("parent.filterSubject")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">{t("parent.all")}</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <DateInput
            label={t("parent.dateFrom")}
            value={from}
            onChange={setFrom}
            max={to || undefined}
          />
          <DateInput
            label={t("parent.dateTo")}
            value={to}
            onChange={setTo}
            min={from || undefined}
          />
        </div>
      </Card>

      <Card title={t("parent.attendancePage.records")}>
        {records.length === 0 ? (
          <EmptyBox>{t("parent.attendanceEmpty")}</EmptyBox>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-muted/70">
                <tr>
                  <th
                    scope="col"
                    className="border-b border-border px-4 py-3 text-start font-black"
                  >
                    {t("parent.date")}
                  </th>
                  <th
                    scope="col"
                    className="border-b border-border px-4 py-3 text-start font-black"
                  >
                    {t("parent.subject")}
                  </th>
                  <th
                    scope="col"
                    className="border-b border-border px-4 py-3 text-start font-black"
                  >
                    {t("parent.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="border-b border-border px-4 py-3">
                      {formatDate(r.date, i18n.language)}
                    </td>
                    <td
                      className="border-b border-border px-4 py-3 font-bold"
                      dir="auto"
                    >
                      {r.subject}
                    </td>
                    <td className="border-b border-border px-4 py-3">
                      <AttendanceBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {child.lessonPresence.length > 0 && (
        <Card title={t("parent.attendancePage.lessonStatus")}>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("parent.attendancePage.lessonStatusText")}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {child.lessonPresence.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <span
                  className="min-w-0 break-words text-sm font-bold"
                  dir="auto"
                >
                  {p.subject}
                </span>
                <AttendanceBadge status={p.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
