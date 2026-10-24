import { ArrowLeft, Check, Copy, ExternalLink, Power, Radio, Users, Video } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import { normalizeRoomLink, useOnlineClasses } from "../../data/onlineClassStore";
import { useTeacherClasses } from "../../data/teacherStore";
import { formatDateTime } from "../../utils/dateFormat";
import TeacherEmptyState from "../../components/teacher/TeacherEmptyState";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

const SKYROOM_URL = "https://www.skyroom.online/";

// `target` is "all" or an array of lesson ids (older saves may hold one id string).
const toLessonIds = (target, lessons) => {
  if (Array.isArray(target)) return target.filter((id) => lessons.some((l) => l.id === id));
  if (target && target !== "all" && lessons.some((l) => l.id === target)) return [target];
  return null; // whole class
};

const studentsFor = (target, classData) => {
  const ids = toLessonIds(target, classData.lessons);
  if (!ids) return classData.students;
  const seen = new Map();
  classData.lessons.filter((l) => ids.includes(l.id)).forEach((l) => l.students.forEach((st) => seen.set(st.id, st)));
  return [...seen.values()];
};

function StepCard({ index, title, text, done, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${
            done ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
          aria-hidden="true"
        >
          {done ? <Check size={18} /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

// Each school class has exactly one Skyroom room. The saved entry
// ({ link, title, target, live, openedAt }) is what the student panel will read.
function OnlineClassForm({ classData, saved, onSave }) {
  const { t } = useTranslation();
  const [link, setLink] = useState(saved?.link ?? "");
  const [title, setTitle] = useState(saved?.title ?? "");
  const [lessonIds, setLessonIds] = useState(toLessonIds(saved?.target, classData.lessons) ?? []);
  const [allSelected, setAllSelected] = useState(toLessonIds(saved?.target, classData.lessons) === null);
  const [error, setError] = useState("");
  const [audienceError, setAudienceError] = useState("");

  const toggleAll = () => {
    setAllSelected((v) => !v);
    setLessonIds([]);
    setAudienceError("");
  };
  const toggleLesson = (id) => {
    const next = lessonIds.includes(id) ? lessonIds.filter((x) => x !== id) : [...lessonIds, id];
    setAudienceError("");
    // Ticking every lesson is the same as "all".
    if (next.length === classData.lessons.length) {
      setAllSelected(true);
      setLessonIds([]);
    } else {
      setAllSelected(false);
      setLessonIds(next);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    let invalid = false;
    if (!link.trim()) {
      setError(t("teacher.online.errors.linkRequired"));
      invalid = true;
    } else if (!normalizeRoomLink(link)) {
      setError(t("teacher.online.errors.linkInvalid"));
      invalid = true;
    }
    if (!allSelected && lessonIds.length === 0) {
      setAudienceError(t("teacher.online.errors.audienceRequired"));
      invalid = true;
    }
    if (invalid) return;
    const normalized = normalizeRoomLink(link);
    setLink(normalized);
    setError("");
    onSave({ link: normalized, title: title.trim(), target: allSelected ? "all" : lessonIds });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="rounded-2xl border border-dashed border-border bg-muted p-4">
        <a
          href={SKYROOM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
        >
          <ExternalLink size={18} aria-hidden="true" />
          {t("teacher.online.createInSkyroom")}
        </a>
        <p className="mt-2 text-sm text-muted-foreground">{t("teacher.online.createInSkyroomHint")}</p>
      </div>
      <Input
        type="url"
        label={`${t("teacher.online.linkLabel")} *`}
        value={link}
        onChange={(e) => {
          setLink(e.target.value);
          setError("");
        }}
        error={error}
        placeholder="https://www.skyroom.online/ch/..."
        dir="ltr"
        className="text-start"
        autoComplete="off"
      />
      <Input
        label={`${t("teacher.online.sessionTitleLabel")} (${t("common.optional")})`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("teacher.online.sessionTitlePlaceholder")}
        maxLength={80}
        dir="auto"
      />
      <fieldset>
        <legend className="mb-1.5 block text-sm font-bold text-foreground">{t("teacher.online.audienceLabel")} *</legend>
        <div className="space-y-2 rounded-2xl border border-border bg-muted p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-card px-3 py-2">
            <span className="min-w-0 font-black text-foreground">
              {t("teacher.online.audienceAll", { count: classData.students.length })}
            </span>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 shrink-0 accent-primary" />
          </label>
          {classData.lessons.map((lesson) => (
            <label key={lesson.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-card px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-bold text-foreground" dir="auto">{lesson.title}</span>
                <span className="text-xs text-muted-foreground">
                  {t("teacher.class.lessonStudents", { count: lesson.students.length })}
                </span>
              </span>
              <input
                type="checkbox"
                checked={allSelected || lessonIds.includes(lesson.id)}
                onChange={() => (allSelected ? (setAllSelected(false), setLessonIds(classData.lessons.filter((l) => l.id !== lesson.id).map((l) => l.id))) : toggleLesson(lesson.id))}
                className="h-4 w-4 shrink-0 accent-primary"
              />
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("teacher.online.audienceHint")}</p>
        {audienceError && (
          <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{audienceError}</p>
        )}
      </fieldset>
      <Button type="submit" variant="primary">
        {t("teacher.online.saveLink")}
      </Button>
    </form>
  );
}

export default function TeacherOnlineClassPage() {
  const { t, i18n } = useTranslation();
  const { classId } = useParams();
  const navigate = useNavigate();
  const { getClass } = useTeacherClasses();
  const { getOnlineClass, saveOnlineClass } = useOnlineClasses();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const classData = getClass(classId);
  const saved = getOnlineClass(classId);

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

  const hasLink = Boolean(saved?.link);
  const live = Boolean(saved?.live && hasLink);
  const recipients = studentsFor(saved?.target, classData);
  const sessionName = saved?.title || classData.name;

  const formatTime = (iso) => formatDateTime(iso, i18n.language);

  const handleSave = (values) => {
    // Changing the audience while the class is open updates it right away.
    saveOnlineClass(classId, values);
    notify(t("teacher.online.linkSaved"));
  };

  const openForStudents = () => {
    if (!hasLink) return notify(t("teacher.online.needLink"));
    saveOnlineClass(classId, { live: true, openedAt: new Date().toISOString() });
    notify(t("teacher.online.opened", { count: recipients.length }));
  };

  const closeClass = () => {
    saveOnlineClass(classId, { live: false });
    notify(t("teacher.online.closed"));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(saved.link);
      notify(t("teacher.online.linkCopied"));
    } catch {
      notify(t("teacher.online.copyFailed"));
    }
  };

  const roomLinkProps = { href: saved?.link, target: "_blank", rel: "noopener noreferrer" };
  const linkBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold transition-colors";

  return shell(
    <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <Link
        to={`/teacher/class/${classData.id}`}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-primary hover:text-primary"
      >
        <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden="true" />
        {t("teacher.class.backToClass")}
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Video size={28} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-foreground">{t("teacher.online.title")}</h1>
          <p className="mt-1 break-words text-muted-foreground" dir="auto">
            {classData.name}
          </p>
        </div>
      </div>

      <div
        role="status"
        className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 ${
          live ? "border-green-500/40 bg-green-50 dark:bg-green-500/10" : "border-border bg-muted"
        }`}
      >
        <Radio size={22} className={live ? "text-green-600 dark:text-green-400" : "text-muted-foreground"} aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-black text-foreground">{live ? t("teacher.online.statusLive") : t("teacher.online.statusIdle")}</p>
          <p className="text-sm text-muted-foreground">
            {live
              ? t("teacher.online.statusLiveText", { time: formatTime(saved.openedAt) })
              : t("teacher.online.statusIdleText")}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <StepCard index={1} done={hasLink} title={t("teacher.online.step1Title")} text={t("teacher.online.step1Text")}>
          <OnlineClassForm
            key={`${classId}:${saved?.link ?? ""}:${saved?.title ?? ""}:${JSON.stringify(saved?.target ?? "all")}`}
            classData={classData}
            saved={saved}
            onSave={handleSave}
          />
        </StepCard>

        <StepCard index={2} title={t("teacher.online.step2Title")} text={t("teacher.online.step2Text")}>
          {hasLink ? (
            <a {...roomLinkProps} className={`${linkBtn} bg-primary text-primary-foreground hover:bg-primary/90`}>
              <ExternalLink size={18} aria-hidden="true" />
              {t("teacher.online.enterRoom")}
            </a>
          ) : (
            <Button variant="primary" disabled>
              <ExternalLink size={18} aria-hidden="true" />
              {t("teacher.online.enterRoom")}
            </Button>
          )}
        </StepCard>

        <StepCard index={3} done={live} title={t("teacher.online.step3Title")} text={t("teacher.online.step3Text")}>
          <div className="flex flex-wrap gap-3">
            {live ? (
              <Button variant="danger" onClick={closeClass}>
                <Power size={18} aria-hidden="true" />
                {t("teacher.online.closeClass")}
              </Button>
            ) : (
              <Button variant="primary" onClick={openForStudents} disabled={!hasLink}>
                <Radio size={18} aria-hidden="true" />
                {t("teacher.online.openForStudents")}
              </Button>
            )}
            <Button variant="outline" onClick={copyLink} disabled={!hasLink}>
              <Copy size={18} aria-hidden="true" />
              {t("teacher.online.copyLink")}
            </Button>
          </div>
          {!hasLink && <p className="mt-3 text-sm text-muted-foreground">{t("teacher.online.needLink")}</p>}
          {hasLink && recipients.length === 0 && (
            <p className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-300">{t("teacher.online.noStudents")}</p>
          )}
        </StepCard>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-black text-foreground">{t("teacher.online.studentPreviewTitle")}</h2>
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted p-5 text-center">
            <div
              className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
                live ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
              aria-hidden="true"
            >
              <Video size={26} />
            </div>
            <p className="mt-3 break-words font-black text-foreground" dir="auto">
              {live ? t("teacher.online.studentPreviewLive", { name: sessionName }) : t("teacher.online.studentPreviewIdle")}
            </p>
            <button
              type="button"
              disabled
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground opacity-60"
            >
              <ExternalLink size={16} aria-hidden="true" />
              {t("teacher.online.joinClass")}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
            <Users size={18} className="text-primary" aria-hidden="true" />
            {t("teacher.online.participantsTitle", { count: recipients.length })}
          </h2>
          {recipients.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("teacher.online.noStudents")}</p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {recipients.map((student) => (
                <li key={student.id} className="rounded-xl bg-muted px-3 py-2 font-bold text-foreground" dir="auto">
                  {student.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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
