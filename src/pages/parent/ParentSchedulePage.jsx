import { BookOpen, CalendarRange, ExternalLink, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { Card, EmptyBox, PageTitle } from "../../components/parent/ParentUi";
import { formatDateTime } from "../../utils/dateFormat";

const DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];

// Only the slots that hold at least one lesson are shown.
const planSlots = (plan) => {
  if (!plan?.days) return [];
  const slots = plan.slots ?? [...new Set(Object.values(plan.days).flatMap((d) => Object.keys(d ?? {})))];
  return slots.filter((slot) => DAYS.some((day) => String(plan.days[day]?.[slot] ?? "").trim()));
};

export default function ParentSchedulePage() {
  const { t, i18n } = useTranslation();
  const { child } = useOutletContext();

  return (
    <div className="space-y-6">
      <PageTitle title={t("parent.schedule.title")} text={t("parent.schedule.text")} />

      {child.classes.length === 0 && <EmptyBox>{t("parent.noClass")}</EmptyBox>}

      {child.classes.map((cls) => {
        const subjects = child.subjects.filter((s) => s.classId === cls.id);
        const plan = child.weeklyPlans.find((p) => p.classId === cls.id)?.plan;
        const slots = planSlots(plan);
        return (
          <Card key={cls.id} title={cls.name} icon={BookOpen}>
            <p className="mb-4 text-sm text-muted-foreground" dir="auto">
              {[
                cls.grade ? t("parent.schedule.grade", { grade: cls.grade }) : null,
                cls.schoolYear ? t("parent.schedule.year", { year: cls.schoolYear }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <h3 className="mb-2 text-sm font-black">{t("parent.schedule.lessons")}</h3>
            {subjects.length === 0 ? (
              <EmptyBox>{t("parent.schedule.noLessons")}</EmptyBox>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {subjects.map((s) => (
                  <li key={s.id} className="rounded-2xl border border-border bg-muted px-4 py-3">
                    <p className="break-words font-bold" dir="auto">
                      {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground" dir="auto">
                      {[s.schedule ? t(`teacher.days.${s.schedule}`) : null, s.teacherName]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mb-2 mt-6 flex items-center gap-2 text-sm font-black">
              <CalendarRange size={16} className="text-primary" aria-hidden="true" />
              {t("parent.schedule.weeklyPlan")}
            </h3>
            {slots.length === 0 ? (
              <EmptyBox>{t("parent.schedule.noPlan")}</EmptyBox>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-muted/70">
                    <tr>
                      <th scope="col" className="border-b border-border px-3 py-2 text-start font-black">
                        {t("teacher.weeklyPlan.time")}
                      </th>
                      {DAYS.map((day) => (
                        <th key={day} scope="col" className="border-b border-border px-3 py-2 text-start font-black">
                          {t(`teacher.days.${day}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot}>
                        <th scope="row" className="whitespace-nowrap border-b border-border px-3 py-2 text-start font-bold" dir="ltr">
                          {slot}
                        </th>
                        {DAYS.map((day) => (
                          <td key={day} className="border-b border-border px-3 py-2" dir="auto">
                            {plan.days[day]?.[slot] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}

      <Card title={t("parent.schedule.onlineClass")} icon={Radio}>
        {child.onlineClasses.length === 0 ? (
          <EmptyBox>{t("parent.schedule.noOnline")}</EmptyBox>
        ) : (
          <ul className="space-y-3">
            {child.onlineClasses.map((s) => (
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
                        ? t("parent.schedule.liveSince", { time: formatDateTime(s.openedAt, i18n.language) })
                        : t("parent.schedule.liveNow")
                      : t("parent.schedule.notLive")}
                  </p>
                </div>
                {s.live && s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  >
                    {t("parent.join")}
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
