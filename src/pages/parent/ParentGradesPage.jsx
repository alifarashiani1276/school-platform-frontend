import { Minus, Star, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import {
  Card,
  EmptyBox,
  PageTitle,
  StatCard,
  gradeTitle,
  useNumberFormat,
} from "../../components/parent/ParentUi";
import DateInput from "../../components/ui/DateInput";
import Select from "../../components/ui/Select";
import { overallGradeAverage, progressOf } from "../../services/parentService";
import { formatDate } from "../../utils/dateFormat";

function Change({ value }) {
  const num = useNumberFormat();
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const tone =
    value > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : value < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 font-black ${tone}`}
      dir="ltr"
    >
      <Icon size={16} aria-hidden="true" />
      {value > 0 ? "+" : ""}
      {num(value)}
    </span>
  );
}

export default function ParentGradesPage() {
  const { t, i18n } = useTranslation();
  const { child } = useOutletContext();
  const num = useNumberFormat();
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const withTitle = useMemo(
    () => child.grades.map((g) => ({ ...g, label: gradeTitle(g, t) })),
    [child, t],
  );
  const subjectOptions = [
    ...new Set(withTitle.map((g) => g.subject).filter(Boolean)),
  ];

  const filteredGrades = useMemo(
    () =>
      withTitle
        .filter(
          (g) =>
            (!subject || g.subject === subject) &&
            (!from || g.date >= from) &&
            (!to || g.date <= to),
        )
        .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [from, subject, to, withTitle],
  );

  const progress = useMemo(() => {
    if (from || to) {
      if (filteredGrades.length < 2) return [];

      const splitIndex = Math.max(1, Math.ceil(filteredGrades.length / 2));
      const oldGrades = filteredGrades.slice(0, splitIndex);
      const newGrades = filteredGrades.slice(splitIndex);
      const oldAvg = overallGradeAverage(oldGrades);
      const newAvg = overallGradeAverage(newGrades);

      if (oldAvg == null || newAvg == null) return [];

      const rows = [
        ...new Set(filteredGrades.map((g) => g.subject).filter(Boolean)),
      ]
        .map((subjectName) => {
          const oldSubject = oldGrades.filter((g) => g.subject === subjectName);
          const newSubject = newGrades.filter((g) => g.subject === subjectName);
          const oldSubjectAvg = overallGradeAverage(oldSubject);
          const newSubjectAvg = overallGradeAverage(newSubject);

          if (oldSubjectAvg == null || newSubjectAvg == null) return null;

          return {
            id: subjectName,
            title: subjectName,
            oldAvg: oldSubjectAvg,
            newAvg: newSubjectAvg,
            change: newSubjectAvg - oldSubjectAvg,
          };
        })
        .filter(Boolean);

      return [
        {
          id: "filtered-range",
          label: t("parent.grades.overall"),
          oldAvg,
          newAvg,
          change: newAvg - oldAvg,
          rows,
        },
      ];
    }

    return progressOf(child);
  }, [child, filteredGrades, from, t, to]);

  const subjectsWithAverage = useMemo(() => {
    const grouped = filteredGrades.reduce((acc, grade) => {
      const subjectName = grade.subject;
      if (!subjectName) return acc;
      if (!acc[subjectName]) acc[subjectName] = [];
      acc[subjectName].push(grade);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([title, grades]) => ({
        id: title,
        title,
        average: overallGradeAverage(grades),
      }))
      .filter((subject) => subject.average != null)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [filteredGrades]);

  const grades = filteredGrades
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <div className="space-y-6">
      <PageTitle
        title={t("parent.grades.title")}
        text={t("parent.grades.text")}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={Star}
          label={t("parent.avgGrade")}
          value={child.average == null ? "—" : num(child.average)}
        />
        {child.ranks.map((r) => (
          <StatCard
            key={r.classId}
            icon={TrendingUp}
            label={t("parent.rankIn", { name: r.className })}
            value={num(r.rank, 0)}
            hint={t("parent.rankOf", { count: r.size })}
          />
        ))}
      </div>

      <Card title={t("parent.filters")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label={t("parent.filterSubject")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">{t("parent.all")}</option>
            {subjectOptions.map((s) => (
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

      <Card title={t("parent.grades.progress")} icon={TrendingUp}>
        {progress.length === 0 ? (
          <EmptyBox>{t("parent.grades.noProgress")}</EmptyBox>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {t("parent.grades.progressText")}
            </p>
            {progress.map((p) => (
              <div key={p.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
                  <span className="font-black" dir="auto">
                    {p.label || t("parent.grades.overall")}
                  </span>
                  <span className="flex items-center gap-3 text-sm" dir="ltr">
                    {num(p.oldAvg)} → {num(p.newAvg)}
                    <Change value={p.change} />
                  </span>
                </div>
                {p.rows.length > 0 && (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {p.rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
                      >
                        <span
                          className="min-w-0 break-words font-bold"
                          dir="auto"
                        >
                          {row.title}
                        </span>
                        <span
                          className="flex shrink-0 items-center gap-2"
                          dir="ltr"
                        >
                          {num(row.oldAvg)} → {num(row.newAvg)}
                          <Change value={row.change} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={t("parent.grades.bySubject")}>
        {subjectsWithAverage.length === 0 ? (
          <EmptyBox>{t("parent.grades.empty")}</EmptyBox>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {subjectsWithAverage.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="break-words font-bold" dir="auto">
                    {s.title}
                  </p>
                  {s.rank != null && (
                    <p className="text-xs text-muted-foreground">
                      {t("parent.grades.subjectRank", {
                        rank: s.rank,
                        count: s.size,
                      })}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-lg font-black" dir="ltr">
                  {num(s.average)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t("parent.grades.results")}>
        {grades.length === 0 ? (
          <EmptyBox>{t("parent.grades.empty")}</EmptyBox>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-muted/70">
                <tr>
                  {["date", "subject", "assessment", "score", "note"].map(
                    (key) => (
                      <th
                        key={key}
                        scope="col"
                        className="border-b border-border px-4 py-3 text-start font-black"
                      >
                        {t(
                          key === "assessment"
                            ? "parent.grades.assessment"
                            : key === "score"
                              ? "parent.grades.score"
                              : key === "note"
                                ? "parent.grades.note"
                                : `parent.${key}`,
                        )}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id}>
                    <td className="whitespace-nowrap border-b border-border px-4 py-3">
                      {formatDate(g.date, i18n.language)}
                    </td>
                    <td
                      className="border-b border-border px-4 py-3 font-bold"
                      dir="auto"
                    >
                      {g.subject}
                    </td>
                    <td className="border-b border-border px-4 py-3" dir="auto">
                      {g.label}
                    </td>
                    <td
                      className="whitespace-nowrap border-b border-border px-4 py-3 font-black"
                      dir="ltr"
                    >
                      {num(g.score)} / {num(g.max, 0)}
                    </td>
                    <td
                      className="border-b border-border px-4 py-3 text-muted-foreground"
                      dir="auto"
                    >
                      {g.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
