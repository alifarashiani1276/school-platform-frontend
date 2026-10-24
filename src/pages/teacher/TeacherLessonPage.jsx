import { ArrowLeft, CheckCircle2, Save, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import { useTeacherClasses } from "../../data/teacherStore";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import DateInput from "../../components/ui/DateInput";
import { formatDate } from "../../utils/dateFormat";

const formatDisplayDate = (value, locale) =>
  formatDate(value, locale, { year: "numeric", month: "2-digit", day: "2-digit" });

export default function TeacherLessonPage() {
  const { t, i18n } = useTranslation();
  const { classId, lessonId } = useParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { getClass, updateClass } = useTeacherClasses();
  const classData = getClass(classId);
  const lesson = classData?.lessons.find((item) => item.id === lessonId);

  const initialGrades = useMemo(
    () =>
      Object.fromEntries(
        (lesson?.students ?? []).map((student) => [
          student.id,
          student.score ?? student.grade ?? 0,
        ]),
      ),
    [lesson],
  );

  const [grades, setGrades] = useState(initialGrades);
  const [gradeBook, setGradeBook] = useState(lesson?.gradeBook ?? []);
  const [examName, setExamName] = useState(() => t("teacher.assessments.newExam"));
  const [examDate, setExamDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    setGrades(initialGrades);
    setGradeBook(lesson?.gradeBook ?? []);
  }, [initialGrades, lesson]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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

  const average =
    lesson.students.length > 0
      ? Math.round(
          lesson.students.reduce(
            (sum, student) =>
              sum + Number(grades[student.id] ?? student.score ?? 0),
            0,
          ) / lesson.students.length,
        )
      : 0;

  const handleGradeChange = (studentId, value) => {
    const cleaned = value.replace(/[^\d]/g, "");
    const nextValue = cleaned === "" ? 0 : Math.min(20, Number(cleaned));
    setGrades((prev) => ({ ...prev, [studentId]: nextValue }));
  };

  const handleSaveGrades = () => {
    const nextEntry = {
      id: `g-${Date.now()}`,
      assessmentName: examName.trim() || t("teacher.assessments.newExam"),
      date: examDate || new Date().toISOString().slice(0, 10),
      scores: Object.fromEntries(
        lesson.students.map((student) => [
          student.id,
          Number(grades[student.id] ?? student.score ?? 0),
        ]),
      ),
    };

    // Persist the exam so other pages (e.g. student progress) can use it.
    updateClass(classId, (cls) => ({
      lessons: cls.lessons.map((item) =>
        item.id === lessonId
          ? {
              ...item,
              gradeBook: [nextEntry, ...(item.gradeBook ?? [])],
              students: item.students.map((st) => ({
                ...st,
                score: nextEntry.scores[st.id] ?? st.score,
              })),
            }
          : item,
      ),
    }));
    setShowToast(true);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 2600);
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
              to={`/teacher/class/${classId}/attendance/${lessonId}`}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              {t("teacher.class.attendanceAction")}
            </Link>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-primary">
                  {classData.name}
                </p>
                <h1 className="mt-1 text-3xl font-black text-foreground">
                  {t("teacher.class.lessonGradingTitle", {
                    title: lesson.title,
                  })}
                </h1>
              </div>

              <button
                type="button"
                onClick={handleSaveGrades}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:translate-y-[-1px]"
              >
                <Save size={16} />
                {t("teacher.class.saveGrades")}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.averageGrade")}
                </p>
                <p className="mt-2 text-3xl font-black text-foreground">
                  {average}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.studentsCount")}
                </p>
                <p className="mt-2 text-3xl font-black text-foreground">
                  {lesson.students.length}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.statusLabel")}
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-lg font-black text-foreground">
                  <CheckCircle2 size={18} className="text-primary" />
                  {t("teacher.class.activeStatus")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">
            <div className="border-b border-border bg-muted/50 px-5 py-4">
              <div className="flex items-center gap-2 text-foreground">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="text-xl font-black">{t("teacher.lesson.recordTitle")}</h2>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-foreground">
                    {t("teacher.lesson.examName")}
                  </label>
                  <input
                    value={examName}
                    onChange={(event) => setExamName(event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    placeholder={t("teacher.lesson.examNamePlaceholder")}
                  />
                </div>

                <div>
                  <DateInput
                    id="exam-date"
                    label={t("teacher.lesson.examDate")}
                    value={examDate}
                    onChange={setExamDate}
                  />
                </div>
              </div>

              <div className="divide-y divide-border rounded-2xl border border-border">
                {lesson.students.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-black text-foreground">
                        {student.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("teacher.class.parentLabel", {
                          parentName: student.parentName,
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 md:w-56">
                      <label className="block flex-1 text-sm font-bold text-muted-foreground">
                        {t("teacher.class.scoreLabel")}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={grades[student.id] ?? student.score ?? 0}
                        onChange={(event) =>
                          handleGradeChange(student.id, event.target.value)
                        }
                        className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-center text-sm font-bold text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card">
            <div className="border-b border-border bg-muted/50 px-5 py-4">
              <div className="flex items-center gap-2 text-foreground">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="text-xl font-black">{t("teacher.lesson.gradesTable")}</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-muted/70 text-foreground">
                  <tr>
                    <th className="border-b border-border px-4 py-3 text-right font-black">
                      {t("teacher.lesson.exam")}
                    </th>
                    <th className="border-b border-border px-4 py-3 text-right font-black">
                      {t("teacher.lesson.date")}
                    </th>
                    {lesson.students.map((student) => (
                      <th
                        key={student.id}
                        className="border-b border-border px-4 py-3 text-right font-black"
                      >
                        {student.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(gradeBook.length > 0 ? gradeBook : []).map((entry) => (
                    <tr key={entry.id} className="align-top">
                      <td className="border-b border-border px-4 py-3 font-bold text-foreground">
                        {entry.assessmentKey ? t(`teacher.assessments.${entry.assessmentKey}`) : entry.assessmentName}
                      </td>
                      <td className="border-b border-border px-4 py-3 text-muted-foreground">
                        {formatDisplayDate(entry.date, i18n.language)}
                      </td>
                      {lesson.students.map((student) => (
                        <td
                          key={`${entry.id}-${student.id}`}
                          className="border-b border-border px-4 py-3 text-center font-black text-foreground"
                        >
                          {entry.scores?.[student.id] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {showToast && (
        <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-card px-4 py-3 shadow-xl shadow-primary/10 ring-1 ring-primary/10 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <p className="text-sm font-black text-foreground">
                {t("teacher.class.gradesSaved")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("teacher.class.gradesSavedSubtitle")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
