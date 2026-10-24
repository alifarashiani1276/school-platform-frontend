import { ArrowLeft, CalendarCheck, Save, UserCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useClassAttendance } from "../../data/classAttendanceStore";
import { mockTeacher } from "../../data/mockTeacherData";
import { useTeacherClasses } from "../../data/teacherStore";
import TeacherEmptyState from "../../components/teacher/TeacherEmptyState";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import Button from "../../components/ui/Button";
import DateInput from "../../components/ui/DateInput";
import { todayIso } from "../../utils/dateFormat";

const STATUSES = [
  { value: "present", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { value: "absent", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
  { value: "late", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
];


// Remounted (key = date) whenever the date changes, so it always starts from
// the saved record of that day, or from "everyone present" for a new day.
function AttendanceRegister({ classData, date, savedDay, onSave }) {
  const { t } = useTranslation();
  const students = classData.students;
  const [marks, setMarks] = useState(() =>
    Object.fromEntries(students.map((s) => [s.id, savedDay?.[s.id] ?? "present"])),
  );
  const [dirty, setDirty] = useState(!savedDay);

  const label = {
    present: t("teacher.class.present"),
    absent: t("teacher.class.absent"),
    late: t("teacher.class.late"),
  };
  const counts = { present: 0, absent: 0, late: 0 };
  students.forEach((s) => {
    counts[marks[s.id]] += 1;
  });

  const mark = (id, status) => {
    setMarks((prev) => ({ ...prev, [id]: status }));
    setDirty(true);
  };
  const markAll = (status) => {
    setMarks(Object.fromEntries(students.map((s) => [s.id, status])));
    setDirty(true);
  };

  return (
    <>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="class-attendance-date" className="mb-1.5 block text-sm font-bold text-foreground">
                {t("teacher.classAttendance.date")}
              </label>
              <DateInput
                id="class-attendance-date"
                value={date}
                max={todayIso()}
                onChange={(value) => value && onSave.changeDate(value)}
                className="min-w-[11rem]"
              />
            </div>
            <span
              className={`mb-1 rounded-full px-3 py-1.5 text-xs font-bold ${
                dirty
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
              }`}
            >
              {dirty ? t("teacher.classAttendance.unsaved") : t("teacher.classAttendance.savedBadge")}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => markAll("present")} disabled={students.length === 0}>
              {t("teacher.classAttendance.markAllPresent")}
            </Button>
            <Button
              variant="primary"
              disabled={students.length === 0}
              onClick={() => {
                onSave.save(marks);
                setDirty(false);
              }}
            >
              <Save size={16} aria-hidden="true" />
              {t("teacher.class.saveAttendance")}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-muted p-4">
            <p className="text-sm font-bold text-muted-foreground">{t("teacher.classAttendance.total")}</p>
            <p className="mt-2 text-3xl font-black text-foreground">{students.length}</p>
          </div>
          {STATUSES.map((s) => (
            <div key={s.value} className="rounded-2xl border border-border bg-muted p-4">
              <p className="text-sm font-bold text-muted-foreground">{label[s.value]}</p>
              <p className="mt-2 text-3xl font-black text-foreground">{counts[s.value]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-4 text-foreground">
          <CalendarCheck size={18} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-black">{t("teacher.class.attendanceRegister")}</h2>
        </div>

        {students.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground">{t("teacher.classAttendance.noStudents")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {students.map((student, index) => (
              <li key={student.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-black text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-black text-foreground" dir="auto">{student.name}</p>
                    {student.parentName && (
                      <p className="break-words text-sm text-muted-foreground" dir="auto">
                        {t("teacher.class.parentLabel", { parentName: student.parentName })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={student.name}>
                  {STATUSES.map((s) => {
                    const active = marks[student.id] === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => mark(student.id, s.value)}
                        className={`rounded-full px-3 py-2 text-sm font-bold transition ${
                          active
                            ? s.color
                            : "border border-border bg-card text-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {label[s.value]}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function TeacherClassAttendancePage() {
  const { t } = useTranslation();
  const { classId } = useParams();
  const navigate = useNavigate();
  const { getClass } = useTeacherClasses();
  const { getDay, saveDay } = useClassAttendance();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [date, setDate] = useState(todayIso);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const classData = getClass(classId);

  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

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

  if (!classData) {
    return shell(
      <main className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <TeacherEmptyState
          title={t("teacher.class.notFound")}
          description=""
          actionLabel={t("teacher.class.backToClasses")}
          onAction={() => navigate("/teacher")}
        />
      </main>,
    );
  }

  return shell(
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Link
        to={`/teacher/class/${classData.id}`}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
      >
        <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden="true" />
        {t("teacher.class.backToClass")}
      </Link>

      <div className="mt-6 mb-6 flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <UserCheck size={28} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-foreground">{t("teacher.classAttendance.title")}</h1>
          <p className="mt-1 break-words font-bold text-primary" dir="auto">{classData.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("teacher.classAttendance.hint")}</p>
        </div>
      </div>

      <AttendanceRegister
        key={`${classId}:${date}`}
        classData={classData}
        date={date}
        savedDay={getDay(classId, date)}
        onSave={{
          changeDate: setDate,
          save: (records) => {
            saveDay(classId, date, records);
            notify(t("teacher.classAttendance.saved"));
          },
        }}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 z-[70] flex max-w-[calc(100vw-2rem)] items-center rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background shadow-xl [inset-inline-end:1rem]"
        >
          {toast}
        </div>
      )}
    </main>,
  );
}
