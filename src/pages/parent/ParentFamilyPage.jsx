import {
  AlertTriangle,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Radio,
  Star,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Card,
  PageTitle,
  useNumberFormat,
} from "../../components/parent/ParentUi";
import { useTeacherClasses } from "../../data/teacherStore";
import {
  removeSchoolChildForParent,
  summarizeChild,
} from "../../services/parentService";
import { getSession } from "../../services/authService";
import { normalizePhone } from "../../utils/jalali";
import { formatDate, todayIso } from "../../utils/dateFormat";

// Family overview: one card per child. It only summarises; every detail page
// still shows one child at a time, chosen explicitly.
export default function ParentFamilyPage() {
  const { t, i18n } = useTranslation();
  const { kids, selectChild } = useOutletContext();
  const num = useNumberFormat();
  const navigate = useNavigate();
  const today = todayIso();
  const { classes: teacherClasses, updateClass } = useTeacherClasses();

  // Removing a child unlinks it from this parent's mobile number; the school
  // keeps its records. Teacher-panel children are unlinked in the teacher store.
  const removeChild = async (child) => {
    if (!window.confirm(t("parent.family.removeConfirm", { name: child.name }))) return;
    const session = await getSession();
    if (session?.role !== "parent") return;
    try {
      if (child.source === "school") {
        removeSchoolChildForParent(session.mobile, child.id);
      } else {
        const mine = (student) =>
          student.id === child.id &&
          normalizePhone(student.parentMobile ?? "") === normalizePhone(session.mobile);
        const clear = (list) =>
          (list ?? []).map((student) =>
            mine(student) ? { ...student, parentMobile: "" } : student,
          );
        teacherClasses
          .filter((cls) => (cls.students ?? []).some(mine))
          .forEach((cls) =>
            updateClass(cls.id, (prev) => ({
              students: clear(prev.students),
              lessons: (prev.lessons ?? []).map((lesson) => ({
                ...lesson,
                students: clear(lesson.students),
              })),
            })),
          );
      }
    } catch {
      window.alert(t("parent.family.removeFailed"));
    }
  };

  const open = (key) => {
    selectChild(key);
    navigate("/parent");
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title={t("parent.family.title")}
        text={t("parent.family.text")}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {kids.map((child) => {
          const sum = summarizeChild(child, today);
          const attention = [
            ...(sum.liveCount
              ? [
                  {
                    id: "live",
                    icon: Radio,
                    text: t("parent.family.liveNow", { count: sum.liveCount }),
                  },
                ]
              : []),
            ...(sum.overdueAssignments
              ? [
                  {
                    id: "overdue",
                    icon: AlertTriangle,
                    text: t("parent.alerts.overdue", {
                      count: sum.overdueAssignments,
                    }),
                  },
                ]
              : []),
            ...(sum.lastAbsentDate
              ? [
                  {
                    id: "absent",
                    icon: CalendarCheck,
                    text: t("parent.alerts.lastAbsent", {
                      date: formatDate(sum.lastAbsentDate, i18n.language),
                    }),
                  },
                ]
              : []),
            ...(sum.teacherAlertCount
              ? [
                  {
                    id: "alerts",
                    icon: AlertTriangle,
                    text: t("parent.family.teacherAlerts", {
                      count: sum.teacherAlertCount,
                    }),
                  },
                ]
              : []),
          ];

          return (
            <Card
              key={child.key}
              title={child.name}
              icon={GraduationCap}
              action={
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                  {t(`parent.source.${child.source}`)}
                </span>
              }
            >
              <p className="mb-4 text-sm text-muted-foreground" dir="auto">
                {child.classes.map((c) => c.name).join(" · ") ||
                  t("parent.noClass")}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <Mini
                  icon={Star}
                  label={t("parent.avgGrade")}
                  value={sum.average == null ? "—" : num(sum.average)}
                />
                <Mini
                  icon={CalendarCheck}
                  label={t("parent.attendance")}
                  value={
                    sum.attendanceRate == null
                      ? "—"
                      : `${num(sum.attendanceRate, 0)}%`
                  }
                />
                <Mini
                  icon={ClipboardList}
                  label={t("parent.family.openAssignments")}
                  value={num(sum.openAssignments, 0)}
                />
              </div>

              <h3 className="mb-2 mt-5 text-sm font-black">
                {t("parent.family.attention")}
              </h3>
              {attention.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  {t("parent.family.allGood")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {attention.map(({ id, icon: Icon, text }) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm font-bold"
                      dir="auto"
                    >
                      <Icon
                        size={16}
                        className="shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {text}
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mb-2 mt-5 flex items-center gap-2 text-sm font-black">
                <Users size={16} className="text-primary" aria-hidden="true" />
                {t("parent.family.teachers")}
              </h3>
              <p className="text-sm text-muted-foreground" dir="auto">
                {sum.teachers.length
                  ? sum.teachers.join("، ")
                  : t("parent.family.noTeachers")}
              </p>

              <button
                type="button"
                onClick={() => open(child.key)}
                className="mt-5 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                {t("parent.family.open")}
              </button>
              <button
                type="button"
                onClick={() => removeChild(child)}
                className="ms-2 mt-5 inline-flex items-center rounded-full border border-red-500/40 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-500/10"
              >
                {t("parent.family.remove")}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted p-3">
      <Icon size={16} className="mb-2 text-primary" aria-hidden="true" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-lg font-black" dir="auto">
        {value}
      </p>
    </div>
  );
}
