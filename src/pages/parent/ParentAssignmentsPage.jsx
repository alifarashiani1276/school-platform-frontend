import { ClipboardList, ExternalLink, Radio } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useOutletContext } from "react-router-dom";
import { Card, EmptyBox, PageTitle } from "../../components/parent/ParentUi";
import Select from "../../components/ui/Select";
import { dueState } from "../../services/parentService";
import { formatDate, formatDateTime, todayIso } from "../../utils/dateFormat";

const STATE_STYLE = {
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  dueToday: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  upcoming: "bg-primary/10 text-primary",
};

export default function ParentAssignmentsPage() {
  const { t, i18n } = useTranslation();
  const { child } = useOutletContext();
  const today = todayIso();
  const [filter, setFilter] = useState("all");

  const assignments = child.assignments
    .map((a) => ({ ...a, state: dueState(a.dueDate, today) }))
    .filter((a) => filter === "all" || a.state === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="space-y-6">
      <PageTitle title={t("parent.assignments.title")} text={t("parent.assignments.text")} />

      <Card
        title={t("parent.nav.assignments")}
        icon={ClipboardList}
        action={
          <Select
            aria-label={t("parent.status")}
            wrapperClassName="w-48"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{t("parent.all")}</option>
            <option value="upcoming">{t("teacher.assignments.status.upcoming")}</option>
            <option value="dueToday">{t("teacher.assignments.status.dueToday")}</option>
            <option value="overdue">{t("teacher.assignments.status.overdue")}</option>
          </Select>
        }
      >
        {assignments.length === 0 ? (
          <EmptyBox>{t("parent.assignments.empty")}</EmptyBox>
        ) : (
          <ul className="space-y-3">
            {assignments.map((a) => (
              <li key={a.id} className="rounded-2xl border border-border bg-muted p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary" dir="auto">
                    {a.subject ?? t("teacher.assignments.badgeAll")}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATE_STYLE[a.state]}`}>
                    {t(`teacher.assignments.status.${a.state}`)}
                  </span>
                  {child.classes.length > 1 && (
                    <span className="text-xs text-muted-foreground" dir="auto">
                      {a.className}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 break-words font-black" dir="auto">
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground" dir="auto">
                    {a.description}
                  </p>
                )}
                <p className="mt-2 text-xs font-bold text-muted-foreground">
                  {t("teacher.assignments.dueOn", { date: formatDate(a.dueDate, i18n.language) })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t("parent.assignments.exams")} icon={Radio}>
        {child.onlineExams.length === 0 ? (
          <EmptyBox>{t("parent.assignments.noExams")}</EmptyBox>
        ) : (
          <ul className="space-y-3">
            {child.onlineExams.map((s) => (
              <li
                key={s.classId}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
                  s.live ? "border-green-500/40 bg-green-50 dark:bg-green-500/10" : "border-border bg-muted"
                }`}
              >
                <div className="min-w-0">
                  <p className="break-words font-black" dir="auto">
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.live
                      ? s.openedAt
                        ? t("parent.assignments.openSince", { time: formatDateTime(s.openedAt, i18n.language) })
                        : t("parent.assignments.openNow")
                      : t("parent.assignments.examClosed")}
                  </p>
                </div>
                {s.live && s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  >
                    {t("parent.assignments.enterExam")}
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          {t("parent.assignments.resultsNote")}{" "}
          <Link to="/parent/grades" className="font-bold text-primary underline-offset-2 hover:underline">
            {t("parent.nav.grades")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
