import { ArrowLeft, CalendarDays, ClipboardList, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import { useAssignments } from "../../data/assignmentStore";
import { useTeacherClasses } from "../../data/teacherStore";
import TeacherEmptyState from "../../components/teacher/TeacherEmptyState";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import DateInput from "../../components/ui/DateInput";
import Input from "../../components/ui/Input";
import { formatDate as formatDateValue, todayIso } from "../../utils/dateFormat";

const ALL = "all";


const fieldClass =
  "w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

// Create / edit form. Creating can target several lessons at once (one
// assignment is created per lesson); editing keeps the assignment on its lesson.
function AssignmentForm({ initial, editing, targetNote, onCancel, onSubmit }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    dueDate: initial?.dueDate ?? "",
  });
  const [errors, setErrors] = useState({});

  const change = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const next = {};
    if (!title) next.title = t("teacher.assignments.errors.titleRequired");
    else if (title.length > 80) next.title = t("teacher.assignments.errors.titleTooLong");
    if (!form.dueDate) next.dueDate = t("teacher.assignments.errors.dueRequired");
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    onSubmit({ title, description: form.description.trim(), dueDate: form.dueDate });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="rounded-xl bg-muted px-3 py-2 text-sm font-bold text-foreground" dir="auto">{targetNote}</p>

      <Input
        label={`${t("teacher.assignments.titleLabel")} *`}
        value={form.title}
        onChange={(e) => change("title", e.target.value)}
        error={errors.title}
        placeholder={t("teacher.assignments.titlePlaceholder")}
        autoFocus
        dir="auto"
      />

      <div>
        <label htmlFor="assignment-description" className="mb-1.5 block text-sm font-bold text-foreground">
          {t("teacher.assignments.descriptionLabel")} ({t("common.optional")})
        </label>
        <textarea
          id="assignment-description"
          rows={4}
          value={form.description}
          onChange={(e) => change("description", e.target.value)}
          placeholder={t("teacher.assignments.descriptionPlaceholder")}
          className={`${fieldClass} resize-y`}
          dir="auto"
        />
      </div>

      <DateInput
        id="assignment-due-date"
        label={`${t("teacher.assignments.dueDate")} *`}
        value={form.dueDate}
        onChange={(value) => change("dueDate", value)}
        error={errors.dueDate}
      />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          {editing ? t("teacher.dialog.save") : t("teacher.assignments.create")}
        </Button>
      </div>
    </form>
  );
}

export default function TeacherAssignmentsPage() {
  const { t, i18n } = useTranslation();
  const { classId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getClass } = useTeacherClasses();
  const { forClass, addAssignments, updateAssignment, deleteAssignment } = useAssignments();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formState, setFormState] = useState(null); // null | { assignment? }
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const classData = getClass(classId);
  const lessons = classData?.lessons ?? [];
  const lessonById = useMemo(() => Object.fromEntries(lessons.map((l) => [l.id, l])), [lessons]);

  const requested = searchParams.get("lesson");
  const filter = requested && lessonById[requested] ? requested : ALL;
  const setFilter = (value) => setSearchParams(value === ALL ? {} : { lesson: value }, { replace: true });

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

  // lessonId === "all" means: sent to every student of the class in every lesson.
  const all = forClass(classId)
    .filter((a) => a.lessonId === ALL || lessonById[a.lessonId])
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const visible = all.filter((a) => (filter === ALL ? a.lessonId === ALL : a.lessonId === filter || a.lessonId === ALL));
  const classWideCount = all.filter((a) => a.lessonId === ALL).length;
  const countFor = (lessonId) => all.filter((a) => a.lessonId === lessonId).length + classWideCount;
  const scopeLesson = filter === ALL ? null : lessonById[filter];
  const today = todayIso();

  const formatDate = (iso) => formatDateValue(iso, i18n.language);

  const statusOf = (iso) =>
    iso < today
      ? { key: "overdue", cls: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" }
      : iso === today
        ? { key: "dueToday", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" }
        : { key: "upcoming", cls: "bg-primary/10 text-primary" };

  const handleSubmit = (values) => {
    if (formState?.assignment) {
      updateAssignment(formState.assignment.id, values);
      notify(t("teacher.assignments.updated"));
    } else {
      addAssignments({ classId, lessonIds: [filter], ...values });
      notify(t(filter === ALL ? "teacher.assignments.createdAll" : "teacher.assignments.createdLesson"));
    }
    setFormState(null);
  };

  const targetNote = (assignment) => {
    const lessonId = assignment ? assignment.lessonId : filter;
    return lessonId === ALL
      ? t("teacher.assignments.targetAll", { count: classData.students.length })
      : t("teacher.assignments.targetLesson", { title: lessonById[lessonId]?.title ?? "", count: lessonById[lessonId]?.students.length ?? 0 });
  };

  const tabClass = (active) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
      active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-muted"
    }`;

  return shell(
    <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <Link
        to={`/teacher/class/${classData.id}`}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-primary hover:text-primary"
      >
        <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden="true" />
        {t("teacher.class.backToClass")}
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-foreground">{t("teacher.assignments.title")}</h1>
          <p className="mt-1 break-words text-muted-foreground" dir="auto">{classData.name}</p>
        </div>
        <Button variant="primary" onClick={() => setFormState({})}>
          <Plus size={18} aria-hidden="true" />
          {filter === ALL ? t("teacher.assignments.addForAll") : t("teacher.assignments.addForLesson")}
        </Button>
      </div>

      <>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("teacher.assignments.filterByLesson")}>
            <button type="button" role="tab" aria-selected={filter === "all"} className={tabClass(filter === "all")} onClick={() => setFilter("all")}>
              {t("teacher.assignments.allLessons")} ({classWideCount})
            </button>
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                role="tab"
                aria-selected={filter === lesson.id}
                className={tabClass(filter === lesson.id)}
                onClick={() => setFilter(lesson.id)}
              >
                <span dir="auto">{lesson.title}</span> ({countFor(lesson.id)})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <TeacherEmptyState
              icon={ClipboardList}
              title={t("teacher.assignments.emptyTitle")}
              description={t("teacher.assignments.emptyText")}
              onAction={() => setFormState({})}
              actionLabel={filter === ALL ? t("teacher.assignments.addForAll") : t("teacher.assignments.addForLesson")}
            />
          ) : (
            <ul className="mt-6 space-y-4">
              {visible.map((item) => {
                const lesson = lessonById[item.lessonId];
                const isAll = item.lessonId === ALL;
                const status = statusOf(item.dueDate);
                return (
                  <li key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary" dir="auto">
                            {isAll ? t("teacher.assignments.badgeAll") : lesson.title}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.cls}`}>
                            {t(`teacher.assignments.status.${status.key}`)}
                          </span>
                        </div>
                        <h3 className="mt-2 break-words text-lg font-black text-foreground" dir="auto">{item.title}</h3>
                        {item.description && (
                          <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground" dir="auto">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-bold text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={16} aria-hidden="true" />
                            {t("teacher.assignments.dueOn", { date: formatDate(item.dueDate) })}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Users size={16} aria-hidden="true" />
                            {t("teacher.class.lessonStudents", { count: isAll ? classData.students.length : lesson.students.length })}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormState({ assignment: item })}
                          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border-2 border-border px-3 text-sm font-bold transition-colors hover:bg-muted"
                        >
                          <Pencil size={14} aria-hidden="true" />
                          {t("teacher.class.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(item)}
                          aria-label={t("teacher.assignments.delete")}
                          title={t("teacher.assignments.delete")}
                          className="grid h-10 w-10 place-items-center rounded-xl border-2 border-border text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </>

      <Dialog
        open={Boolean(formState)}
        onClose={() => setFormState(null)}
        title={
          formState?.assignment
            ? t("teacher.assignments.editTitle")
            : scopeLesson
              ? t("teacher.assignments.newTitleLesson", { title: scopeLesson.title })
              : t("teacher.assignments.newTitleAll")
        }
        size="md"
      >
        {formState && (
          <AssignmentForm
            key={formState.assignment?.id ?? "new"}
            initial={formState.assignment}
            editing={Boolean(formState.assignment)}
            targetNote={targetNote(formState.assignment)}
            onCancel={() => setFormState(null)}
            onSubmit={handleSubmit}
          />
        )}
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} title={t("teacher.assignments.deleteTitle")} size="sm">
        {deleting && (
          <div className="space-y-4">
            <p className="text-foreground" dir="auto">{t("teacher.assignments.deleteText", { title: deleting.title })}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleting(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  deleteAssignment(deleting.id);
                  setDeleting(null);
                  notify(t("teacher.assignments.deleted"));
                }}
              >
                {t("teacher.assignments.delete")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

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
