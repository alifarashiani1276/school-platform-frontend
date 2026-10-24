import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Save,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import { useTeacherClasses } from "../../data/teacherStore";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";

const attendanceTypes = [
  { value: "present", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  { value: "absent", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
  { value: "late", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
];

export default function TeacherAttendancePage() {
  const { t } = useTranslation();
  const { classId, lessonId } = useParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { getClass } = useTeacherClasses();
  const classData = getClass(classId);
  const lesson = classData?.lessons.find((item) => item.id === lessonId);

  const [attendance, setAttendance] = useState(() =>
    Object.fromEntries(
      (lesson?.students ?? []).map((student) => [
        student.id,
        student.presence ?? "present",
      ]),
    ),
  );

  const attendanceText = {
    present: t("teacher.class.present"),
    absent: t("teacher.class.absent"),
    late: t("teacher.class.late"),
  };

  if (!classData || !lesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-black text-foreground">
            {t("teacher.class.lessonNotFound")}
          </h1>
          <Link to={`/teacher/class/${classId}`} className="mt-4 inline-block">
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              {t("teacher.class.backToClass")}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const counts = attendanceTypes.reduce(
    (acc, type) => ({
      ...acc,
      [type.value]: lesson.students.filter(
        (student) => attendance[student.id] === type.value,
      ).length,
    }),
    { present: 0, absent: 0, late: 0 },
  );

  const updateAttendance = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 transition-all duration-300">
        <TeacherTopbar
          teacher={mockTeacher}
          onToggleMobileMenu={() => setMobileSidebarOpen((prev) => !prev)}
        />

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link
              to={`/teacher/class/${classId}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              <ArrowLeft size={16} />
              {t("teacher.class.backToClass")}
            </Link>

            <Link
              to={`/teacher/class/${classId}/lesson/${lessonId}`}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              {t("teacher.class.lessonGrading")}
            </Link>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-primary">
                  {classData.name}
                </p>
                <h1 className="mt-1 text-3xl font-black text-foreground">
                  {t("teacher.class.attendanceTitle", { title: lesson.title })}
                </h1>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                <Save size={16} />
                {t("teacher.class.saveAttendance")}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.present")}
                </p>
                <p className="mt-2 text-3xl font-black text-foreground">
                  {counts.present}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.absent")}
                </p>
                <p className="mt-2 text-3xl font-black text-foreground">
                  {counts.absent}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.late")}
                </p>
                <p className="mt-2 text-3xl font-black text-foreground">
                  {counts.late}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">
            <div className="border-b border-border bg-muted/50 px-5 py-4">
              <div className="flex items-center gap-2 text-foreground">
                <CalendarCheck size={18} className="text-primary" />
                <h2 className="text-xl font-black">
                  {t("teacher.class.attendanceRegister")}
                </h2>
              </div>
            </div>

            <div className="divide-y divide-border">
              {lesson.students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-black text-foreground">{student.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("teacher.class.parentLabel", {
                        parentName: student.parentName,
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {attendanceTypes.map((type) => {
                      const active = attendance[student.id] === type.value;

                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            updateAttendance(student.id, type.value)
                          }
                          className={`rounded-full px-3 py-2 text-sm font-bold transition ${
                            active
                              ? type.color
                              : "border border-border bg-card text-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          {attendanceText[type.value]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
