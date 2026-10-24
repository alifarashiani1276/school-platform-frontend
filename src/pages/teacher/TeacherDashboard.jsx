import { LayoutDashboard, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { mockResources, mockTeacher } from "../../data/mockTeacherData";
import { useTeacherClasses } from "../../data/teacherStore";
import ClassCard from "../../components/teacher/ClassCard";
import CreateClassCard from "../../components/teacher/CreateClassCard";
import CreateClassDialog from "../../components/teacher/CreateClassDialog";
import EditClassDialog from "../../components/teacher/EditClassDialog";
import ResourceCard from "../../components/teacher/ResourceCard";
import TeacherEmptyState from "../../components/teacher/TeacherEmptyState";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import Select from "../../components/ui/Select";

const unique = (values) => [...new Set(values.filter(Boolean))];

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const {
    classes,
    activeClasses,
    archivedClasses,
    addClass,
    updateClass,
    archiveClass,
    restoreClass,
  } = useTeacherClasses();
  const [searchParams, setSearchParams] = useSearchParams();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [resource, setResource] = useState(null);
  const [view, setView] = useState("active");
  const [gradeFilter, setGradeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  // The sidebar's "New Class" link opens the dialog via ?new=1.
  useEffect(() => {
    if (searchParams.has("new")) {
      setCreateOpen(true);
      setView("active");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const source = view === "active" ? activeClasses : archivedClasses;
  const grades = useMemo(
    () =>
      unique(classes.map((c) => c.grade)).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [classes],
  );
  const subjects = useMemo(
    () => unique(classes.map((c) => c.subject)).sort(),
    [classes],
  );

  const visible = source.filter(
    (c) =>
      (!gradeFilter || c.grade === gradeFilter) &&
      (!subjectFilter || c.subject === subjectFilter),
  );
  const filtering = Boolean(gradeFilter || subjectFilter);

  const clearFilters = () => {
    setGradeFilter("");
    setSubjectFilter("");
  };

  const handleCreate = (values) => {
    addClass(values);
    setCreateOpen(false);
    setView("active");
    clearFilters();
    notify(t("teacher.dashboard.classCreated"));
  };

  const handleEdit = (values) => {
    updateClass(values.id, values);
    setEditingClass(null);
    notify(t("teacher.dashboard.classUpdated"));
  };

  const handleArchive = (id) => {
    archiveClass(id);
    notify(t("teacher.dashboard.classArchived"));
  };

  const handleRestore = (id) => {
    restoreClass(id);
    notify(t("teacher.dashboard.classRestored"));
  };

  const tabClass = (active) =>
    `rounded-full px-4 py-2 text-sm font-bold transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-card text-foreground border border-border hover:bg-muted"
    }`;

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <TeacherTopbar
          teacher={mockTeacher}
          onToggleMobileMenu={() => setMobileOpen((v) => !v)}
        />

        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-black text-foreground">
              {t("teacher.dashboard.myClasses")}
            </h1>
            <Link
              to="/teacher/overview"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <LayoutDashboard size={16} aria-hidden="true" />
              {t("teacher.nav.overview")}
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex gap-2" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === "active"}
                className={tabClass(view === "active")}
                onClick={() => setView("active")}
              >
                {t("teacher.dashboard.tabActive")} ({activeClasses.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "archived"}
                className={tabClass(view === "archived")}
                onClick={() => setView("archived")}
              >
                {t("teacher.dashboard.tabArchived")} ({archivedClasses.length})
              </button>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row lg:justify-end">
              <Select
                aria-label={t("teacher.dashboard.gradeFilter")}
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                wrapperClassName="w-full sm:w-48"
              >
                <option value="">{t("teacher.dashboard.allGrades")}</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {t("teacher.class.gradeValue", { value: g })}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={t("teacher.dashboard.subjectFilter")}
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                wrapperClassName="w-full sm:w-52"
              >
                <option value="">{t("teacher.dashboard.allSubjects")}</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <section
            className="mt-6"
            aria-label={t("teacher.dashboard.myClasses")}
          >
            {visible.length === 0 && view === "archived" && !filtering ? (
              <TeacherEmptyState
                title={t("teacher.dashboard.noArchived")}
                description=""
              />
            ) : visible.length === 0 && filtering ? (
              <TeacherEmptyState
                icon={SearchX}
                title={t("teacher.dashboard.noResults")}
                description=""
                actionLabel={t("teacher.dashboard.clearFilters")}
                onAction={clearFilters}
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 min-[1500px]:grid-cols-4">
                {visible.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    classData={cls}
                    onEdit={setEditingClass}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                  />
                ))}
                {view === "active" && !filtering && (
                  <CreateClassCard onClick={() => setCreateOpen(true)} />
                )}
              </div>
            )}
            {view === "active" &&
              classes.length > 0 &&
              activeClasses.length === 0 &&
              !filtering && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {t("teacher.empty.description")}
                </p>
              )}
          </section>

          <section className="mt-12" aria-labelledby="resources-heading">
            <h2
              id="resources-heading"
              className="mb-4 text-2xl font-black text-foreground"
            >
              {t("teacher.dashboard.resources")}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {mockResources.map((r) => (
                <ResourceCard key={r.id} resource={r} onOpen={setResource} />
              ))}
            </div>
          </section>
        </main>
      </div>

      <CreateClassDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        existingNames={classes.map((c) => c.name)}
      />

      <EditClassDialog
        open={Boolean(editingClass)}
        classData={editingClass}
        onClose={() => setEditingClass(null)}
        onSubmit={handleEdit}
        existingNames={classes.map((c) => c.name)}
      />

      <Dialog
        open={Boolean(resource)}
        onClose={() => setResource(null)}
        title={resource ? t(`teacher.resources.${resource.key}.title`) : ""}
        size="sm"
      >
        {resource && (
          <div className="space-y-4">
            <div
              className={`flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br text-6xl ${resource.color}`}
              aria-hidden="true"
            >
              {resource.emoji}
            </div>
            <p className="text-foreground">
              {t(`teacher.resources.${resource.key}.description`)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(`teacher.resources.${resource.key}.details`)}
            </p>
            <p className="rounded-xl bg-muted px-3 py-2 text-sm font-bold text-muted-foreground">
              {t("teacher.resources.comingSoon")}
            </p>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setResource(null)}
            >
              {t("common.close")}
            </Button>
          </div>
        )}
      </Dialog>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 z-[70] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background shadow-xl [inset-inline-end:1rem]"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast("")}
            aria-label={t("common.close")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
