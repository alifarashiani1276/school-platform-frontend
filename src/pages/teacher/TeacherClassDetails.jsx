import {
  UserMinus,
  ArrowLeft,
  BookOpen,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  MessageSquareText,
  School,
  Star,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  chargeLessonFee,
  mockTeacher,
  rechargeTeacherWallet,
  teacherWallet,
} from "../../data/mockTeacherData";
import { useAssignments } from "../../data/assignmentStore";
import { useOnlineClasses } from "../../data/onlineClassStore";
import { useOnlineExams } from "../../data/onlineExamStore";
import { useTeacherClasses } from "../../data/teacherStore";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import AccordionItem from "../../components/ui/Accordion";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import { isValidIranianMobile, normalizePhone } from "../../utils/jalali";
import {
  buildClassRanking,
  buildLessonRankings,
} from "../../utils/studentProgress";

const LESSON_SCHEDULES = ["sat", "sun", "mon", "tue", "wed"];

export default function TeacherClassDetails() {
  const { t, i18n } = useTranslation();
  const { classId } = useParams();
  const { hash } = useLocation();
  const { getClass, updateClass } = useTeacherClasses();
  const { forClass: assignmentsForClass } = useAssignments();
  const { getOnlineClass } = useOnlineClasses();
  const { getOnlineExam } = useOnlineExams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const activeClass = getClass(classId);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [studentsListOpen, setStudentsListOpen] = useState(false);

  // Teacher removes a student from the whole class (and every lesson of it)
  // or from one lesson only.
  const removeFromClass = (student) => {
    if (!window.confirm(t("teacher.class.removeConfirm", { name: student.name }))) return;
    updateClass(currentClass.id, (prev) => ({
      students: prev.students.filter((item) => item.id !== student.id),
      lessons: prev.lessons.map((lesson) => ({
        ...lesson,
        students: lesson.students.filter((item) => item.id !== student.id),
      })),
    }));
  };
  const removeFromLesson = (student, lessonId) => {
    const lesson = currentClass.lessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    if (!window.confirm(t("teacher.class.removeLessonConfirm", { name: student.name, lesson: lesson.title }))) return;
    updateClass(currentClass.id, (prev) => ({
      lessons: prev.lessons.map((item) =>
        item.id === lessonId
          ? { ...item, students: item.students.filter((x) => x.id !== student.id) }
          : item,
      ),
    }));
  };
  // Only one ranking accordion can be open at a time: "overall", a lesson id, or null.
  const [openRankKey, setOpenRankKey] = useState(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: "", schedule: "sat" });
  const [studentForm, setStudentForm] = useState({
    name: "",
    parentName: "",
    parentMobile: "",
    selectedLessonIds: [],
  });
  const [teacherBalance, setTeacherBalance] = useState(teacherWallet.balance);
  const [creditInput, setCreditInput] = useState("500000");

  useEffect(() => {
    setLessonForm({ title: "", schedule: "sat" });
    setStudentForm({ name: "", parentName: "", parentMobile: "", selectedLessonIds: [] });
    setStudentsListOpen(false);
    setStudentDialogOpen(false);
    setOpenRankKey(null);
  }, [classId]);

  // Deep-link from the dashboard's "Manage" button (#students) opens the list.
  useEffect(() => {
    if (hash === "#students" && activeClass) {
      setStudentsListOpen(true);
    }
  }, [hash, activeClass?.id]);

  // Hooks must run on every render, so these sit above the "not found" return.
  const lessonRankings = useMemo(
    () => buildLessonRankings(activeClass),
    [activeClass],
  );
  const overallRanking = useMemo(
    () => buildClassRanking(activeClass),
    [activeClass],
  );

  if (!activeClass) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-foreground">
            {t("teacher.class.notFound")}
          </h1>
          <Link to="/teacher" className="mt-4 inline-block">
            <Button variant="primary">
              {t("teacher.class.backToClasses")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentClass = activeClass;
  const classAssignments = assignmentsForClass(currentClass.id);
  const onlineLive = Boolean(getOnlineClass(currentClass.id)?.live);
  const examLive = Boolean(getOnlineExam(currentClass.id)?.live);
  const formatAverage = (value) =>
    value == null
      ? "—"
      : Number(value).toLocaleString(i18n.language, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        });

  const handleRechargeWallet = (amount) => {
    const nextBalance = rechargeTeacherWallet(amount);
    setTeacherBalance(nextBalance);
    setWalletDialogOpen(false);
    setCreditInput("500000");
  };

  const handleCreateLesson = () => {
    if (!lessonForm.title.trim()) return;

    const result = chargeLessonFee();
    if (!result.success) {
      setWalletDialogOpen(true);
      setTeacherBalance(teacherWallet.balance);
      return;
    }

    setTeacherBalance(teacherWallet.balance);

    const newLesson = {
      id: `l${Date.now()}`,
      title: lessonForm.title.trim(),
      schedule: lessonForm.schedule,
      attendanceRate: 0,
      avgGrade: 0,
      students: [],
    };

    updateClass(currentClass.id, (prev) => ({
      lessons: [...prev.lessons, newLesson],
    }));

    setLessonForm({ title: "", schedule: "sat" });
    setLessonDialogOpen(false);
  };

  const handleCreateStudent = () => {
    if (!studentForm.name.trim() || !studentForm.parentName.trim()) return;
    if (studentForm.selectedLessonIds.length === 0) return;
    // The parent's mobile is optional, but when given it must be valid: it is
    // what lets that parent sign in and see this student in the parent panel.
    if (studentForm.parentMobile.trim() && !isValidIranianMobile(studentForm.parentMobile)) return;

    const newStudent = {
      id: `s${Date.now()}`,
      name: studentForm.name.trim(),
      parentName: studentForm.parentName.trim(),
      ...(studentForm.parentMobile.trim()
        ? { parentMobile: normalizePhone(studentForm.parentMobile) }
        : {}),
      status: "present",
      grade: 0,
      presence: "present",
      score: 0,
    };

    updateClass(currentClass.id, (prev) => {
      const nextLessons = prev.lessons.map((lesson) =>
        studentForm.selectedLessonIds.includes(lesson.id)
          ? {
              ...lesson,
              students: [...lesson.students, { ...newStudent, score: 0 }],
            }
          : lesson,
      );

      return {
        ...prev,
        students: [...prev.students, newStudent],
        lessons: nextLessons,
      };
    });

    setStudentForm({ name: "", parentName: "", parentMobile: "", selectedLessonIds: [] });
    setStudentDialogOpen(false);
  };

  const toggleLessonSelection = (lessonId) => {
    setStudentForm((prev) => {
      const next = prev.selectedLessonIds.includes(lessonId)
        ? prev.selectedLessonIds.filter((id) => id !== lessonId)
        : [...prev.selectedLessonIds, lessonId];

      return { ...prev, selectedLessonIds: next };
    });
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

        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <Link
            to="/teacher"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft size={16} />
            {t("teacher.class.backToClasses")}
          </Link>

          <div className="mt-6 rounded-2xl border border-border bg-card p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-6">
                <div
                  className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-5xl ${currentClass.color}`}
                >
                  {currentClass.emoji}
                </div>

                <div className="flex-1">
                  <h1
                    className="break-words text-3xl font-black text-foreground"
                    dir="auto"
                  >
                    {currentClass.name}
                  </h1>
                  {currentClass.schoolName && (
                    <p
                      className="mt-2 inline-flex items-center gap-2 text-base font-bold text-primary"
                      dir="auto"
                    >
                      <School size={18} aria-hidden="true" />
                      {currentClass.schoolName}
                    </p>
                  )}
                  <p className="mt-2 text-lg text-muted-foreground">
                    {[currentClass.subject, currentClass.schoolYear]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                  {currentClass.description && (
                    <p
                      className="mt-2 max-w-2xl break-words text-sm text-muted-foreground"
                      dir="auto"
                    >
                      {currentClass.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                    <Users size={20} />
                    <span className="font-bold">
                      {t("teacher.class.lessonStudents", {
                        count: currentClass.students.length,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
                <div className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold text-primary">
                  {teacherBalance.toLocaleString(i18n.language)}{" "}
                  {t(teacherWallet.currencyKey)}
                </div>

                <Link
                  to={`/teacher/class/${currentClass.id}/assignments`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                >
                  <ClipboardList size={16} aria-hidden="true" />
                  {t("teacher.assignments.sendToAll")}
                </Link>

                <Link
                  to={`/teacher/class/${currentClass.id}/attendance`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                >
                  <UserCheck size={16} aria-hidden="true" />
                  {t("teacher.classAttendance.title")}
                </Link>

                <Link
                  to={`/teacher/class/${currentClass.id}/weekly-plan`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                >
                  <CalendarRange size={16} aria-hidden="true" />
                  {t("teacher.nav.weeklyPlan")}
                </Link>

                <Link
                  to={`/teacher/class/${currentClass.id}/online`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                >
                  <Video size={16} aria-hidden="true" />
                  {t("teacher.online.title")}
                  {onlineLive && (
                    <span
                      className="h-2 w-2 rounded-full bg-green-500"
                      title={t("teacher.online.statusLive")}
                      aria-label={t("teacher.online.statusLive")}
                    />
                  )}
                </Link>

                <Link
                  to={`/teacher/class/${currentClass.id}/exam`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                >
                  <ClipboardCheck size={16} aria-hidden="true" />
                  {t("teacher.onlineExam.title")}
                  {examLive && (
                    <span
                      className="h-2 w-2 rounded-full bg-green-500"
                      title={t("teacher.onlineExam.statusLive")}
                      aria-label={t("teacher.onlineExam.statusLive")}
                    />
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => setLessonDialogOpen(true)}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  + {t("teacher.class.addLesson")}
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted p-5">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.studentsLabel")}
                </p>
                <p className="mt-3 text-3xl font-black text-foreground">
                  {currentClass.students.length}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted p-5">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.lessonsLabel")}
                </p>
                <p className="mt-3 text-3xl font-black text-foreground">
                  {currentClass.lessons.length}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted p-5">
                <p className="text-sm font-bold text-muted-foreground">
                  {t("teacher.class.attendanceAverageLabel")}
                </p>
                <p className="mt-3 text-3xl font-black text-foreground">
                  {Math.round(
                    currentClass.lessons.reduce(
                      (sum, lesson) => sum + lesson.attendanceRate,
                      0,
                    ) / Math.max(currentClass.lessons.length, 1),
                  )}
                  %
                </p>
              </div>
            </div>

            <button
              id="students"
              type="button"
              onClick={() => setStudentsListOpen(true)}
              className="mt-8 flex w-full scroll-mt-20 items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-start shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Users size={22} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-black text-foreground">
                    {t("teacher.class.studentsTitle")}
                    <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
                      {currentClass.students.length}
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {t("teacher.class.studentsCardHint")}
                  </span>
                </span>
              </span>
              <ChevronRight
                size={20}
                aria-hidden="true"
                className="shrink-0 text-primary rtl:-scale-x-100"
              />
            </button>

            <div className="mt-10">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                <h2 className="text-xl font-black text-foreground">
                  {t("teacher.class.lessonsTitle")}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {currentClass.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-black text-foreground">
                        {lesson.title}
                      </h3>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        {t(`teacher.days.${lesson.schedule}`)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <p>
                        {t("teacher.class.lessonAttendance", {
                          value: lesson.attendanceRate,
                        })}
                      </p>
                      <p>
                        {t("teacher.class.lessonAvgGrade", {
                          value: lesson.avgGrade,
                        })}
                      </p>
                      <p>
                        {t("teacher.class.lessonStudents", {
                          count: lesson.students.length,
                        })}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Link
                        to={`/teacher/class/${currentClass.id}/lesson/${lesson.id}`}
                        className="flex-1 rounded-xl border border-border px-3 py-2 text-center text-sm font-bold text-foreground hover:border-primary hover:text-primary"
                      >
                        {t("teacher.class.gradeAction")}
                      </Link>
                      <Link
                        to={`/teacher/class/${currentClass.id}/attendance/${lesson.id}`}
                        className="flex-1 rounded-xl bg-muted px-3 py-2 text-center text-sm font-bold text-foreground hover:bg-muted/80"
                      >
                        {t("teacher.class.attendanceAction")}
                      </Link>
                    </div>

                    <Link
                      to={`/teacher/class/${currentClass.id}/assignments?lesson=${lesson.id}`}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-foreground hover:border-primary hover:text-primary"
                    >
                      <ClipboardList size={14} aria-hidden="true" />
                      {t("teacher.assignments.lessonLink", {
                        count: classAssignments.filter(
                          (a) =>
                            a.lessonId === lesson.id || a.lessonId === "all",
                        ).length,
                      })}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  <h2 className="text-xl font-black text-foreground">
                    {t("teacher.ranking.title")}
                  </h2>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                  {t("teacher.ranking.summary", {
                    count: overallRanking.length,
                  })}
                </span>
              </div>

              <div className="space-y-3 p-5">
                <AccordionItem
                  open={openRankKey === "overall"}
                  onToggle={() =>
                    setOpenRankKey((prev) => (prev === "overall" ? null : "overall"))
                  }
                  title={t("teacher.ranking.overallTitle")}
                  meta={t("teacher.ranking.summary", {
                    count: overallRanking.length,
                  })}
                >
                  <RankingTable
                    rows={overallRanking}
                    formatAverage={formatAverage}
                    t={t}
                  />
                </AccordionItem>

                {lessonRankings.map(({ lesson, rows, average }) => (
                  <AccordionItem
                    key={lesson.id}
                    open={openRankKey === lesson.id}
                    onToggle={() =>
                      setOpenRankKey((prev) => (prev === lesson.id ? null : lesson.id))
                    }
                    title={lesson.title}
                    meta={t("teacher.ranking.lessonAverage", {
                      value: formatAverage(average),
                    })}
                  >
                    <RankingTable
                      rows={rows}
                      formatAverage={formatAverage}
                      t={t}
                    />
                  </AccordionItem>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <div className="mb-4 flex items-center gap-2">
                <Star size={18} className="text-primary" />
                <h2 className="text-xl font-black text-foreground">
                  {t("teacher.class.gradesStatusTitle")}
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {currentClass.students.slice(0, 4).map((student) => (
                  <div
                    key={student.id}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-foreground">
                        {student.name}
                      </p>
                      <span className="text-sm font-bold text-primary">
                        {student.grade}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${student.grade}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {lessonDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-xl font-black text-foreground">
                {t("teacher.class.newLessonTitle")}
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-foreground">
                  {t("teacher.class.lessonName")}
                </label>
                <input
                  value={lessonForm.title}
                  onChange={(event) =>
                    setLessonForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  placeholder={t("teacher.class.lessonNamePlaceholder")}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-foreground">
                  {t("teacher.class.lessonSchedule")}
                </label>
                <select
                  value={lessonForm.schedule}
                  onChange={(event) =>
                    setLessonForm((prev) => ({
                      ...prev,
                      schedule: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  {LESSON_SCHEDULES.map((day) => (
                    <option key={day} value={day}>
                      {t(`teacher.days.${day}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLessonDialogOpen(false)}
                  className="flex-1"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreateLesson}
                  className="flex-1"
                >
                  {t("teacher.dialog.create")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {walletDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-foreground">
                {t("teacher.wallet.rechargeTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setWalletDialogOpen(false)}
                className="rounded-full border border-border px-2 py-1 text-sm text-foreground"
              >
                ×
              </button>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              {t("teacher.wallet.insufficientBalance")}
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-bold text-foreground">
                {t("teacher.wallet.customAmount")}
              </label>
              <input
                type="number"
                min="100000"
                step="100000"
                value={creditInput}
                onChange={(event) => setCreditInput(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWalletDialogOpen(false)}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleRechargeWallet(Number(creditInput) || 0)}
                className="flex-1"
              >
                {t("teacher.wallet.confirmRecharge")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={studentsListOpen}
        onClose={() => {
          if (!studentDialogOpen) setStudentsListOpen(false);
        }}
        title={`${t("teacher.class.studentsTitle")} (${currentClass.students.length})`}
        size="lg"
      >
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={() => setStudentDialogOpen(true)}
          >
            <UserPlus size={16} aria-hidden="true" />
            {t("teacher.class.addStudent")}
          </Button>
        </div>

        {currentClass.students.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted p-4 text-center text-sm text-muted-foreground">
            {t("teacher.class.noStudents")}
          </p>
        ) : (
          <div className="space-y-3">
            {currentClass.students.map((student) => (
              <div
                key={student.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words font-black text-foreground" dir="auto">
                    {student.name}
                  </p>
                  <p className="break-words text-sm text-muted-foreground" dir="auto">
                    {t("teacher.class.parentLabel", {
                      parentName: student.parentName,
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                    {t(`teacher.class.${student.status}`)}
                  </span>
                  <Link
                    to={`/teacher/class/${currentClass.id}/student/${student.id}/progress`}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-bold text-foreground hover:border-primary hover:text-primary"
                  >
                    <TrendingUp size={14} aria-hidden="true" />
                    {t("teacher.progress.action")}
                  </Link>
                  <Link
                    to={`/teacher/class/${currentClass.id}/student/${student.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-bold text-foreground hover:border-primary hover:text-primary"
                  >
                    <MessageSquareText size={14} aria-hidden="true" />
                    {t("teacher.class.chatAction")}
                  </Link>
                  {currentClass.lessons.some((lesson) =>
                    lesson.students.some((item) => item.id === student.id),
                  ) && (
                    <select
                      value=""
                      aria-label={t("teacher.class.removeFromLesson")}
                      onChange={(event) => removeFromLesson(student, event.target.value)}
                      className="rounded-full border border-border bg-card px-3 py-2 text-sm font-bold"
                    >
                      <option value="">{t("teacher.class.removeFromLesson")}</option>
                      {currentClass.lessons
                        .filter((lesson) => lesson.students.some((item) => item.id === student.id))
                        .map((lesson) => (
                          <option key={lesson.id} value={lesson.id}>
                            {lesson.title}
                          </option>
                        ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFromClass(student)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-500/10"
                  >
                    <UserMinus size={14} aria-hidden="true" />
                    {t("teacher.class.removeFromClass")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>

      <Dialog
        open={studentDialogOpen}
        onClose={() => setStudentDialogOpen(false)}
        title={t("teacher.class.newStudentTitle")}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">
                {t("teacher.class.studentName")}
              </label>
              <input
                value={studentForm.name}
                onChange={(event) =>
                  setStudentForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder={t("teacher.class.studentNamePlaceholder")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-foreground">
                {t("teacher.class.parentName")}
              </label>
              <input
                value={studentForm.parentName}
                onChange={(event) =>
                  setStudentForm((prev) => ({
                    ...prev,
                    parentName: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder={t("teacher.class.parentNamePlaceholder")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-bold text-foreground">
                {t("teacher.class.parentMobile")}{" "}
                <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
              </label>
              <input
                value={studentForm.parentMobile}
                onChange={(event) =>
                  setStudentForm((prev) => ({
                    ...prev,
                    parentMobile: event.target.value,
                  }))
                }
                inputMode="tel"
                dir="ltr"
                aria-invalid={
                  studentForm.parentMobile.trim() && !isValidIranianMobile(studentForm.parentMobile)
                    ? true
                    : undefined
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder="09xxxxxxxxx"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {studentForm.parentMobile.trim() && !isValidIranianMobile(studentForm.parentMobile)
                  ? t("teacher.class.parentMobileInvalid")
                  : t("teacher.class.parentMobileHint")}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">
              {t("teacher.class.assignToLessons")}
            </label>
            <div className="space-y-2 rounded-2xl border border-border bg-muted p-3">
              {currentClass.lessons.map((lesson) => (
                <label
                  key={lesson.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-card px-3 py-2"
                >
                  <span className="font-bold text-foreground">
                    {lesson.title}
                  </span>
                  <input
                    type="checkbox"
                    checked={studentForm.selectedLessonIds.includes(
                      lesson.id,
                    )}
                    onChange={() => toggleLessonSelection(lesson.id)}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStudentDialogOpen(false)}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateStudent}
              className="flex-1"
            >
              {t("teacher.class.saveStudent")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function RankingTable({ rows, formatAverage, t }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-muted p-3 text-center text-sm text-muted-foreground">
        {t("teacher.ranking.empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead className="text-foreground">
          <tr>
            <th className="border-b border-border px-3 py-2 text-start font-black">
              {t("teacher.ranking.rank")}
            </th>
            <th className="border-b border-border px-3 py-2 text-start font-black">
              {t("teacher.ranking.student")}
            </th>
            <th className="border-b border-border px-3 py-2 text-start font-black">
              {t("teacher.ranking.average")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border-b border-border px-3 py-2 font-black text-primary">
                #{row.rank}
              </td>
              <td className="border-b border-border px-3 py-2 font-bold text-foreground">
                {row.name}
              </td>
              <td className="border-b border-border px-3 py-2 font-black text-foreground">
                {formatAverage(row.average)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
