import {
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  LibraryBig,
  MessageSquare,
  PencilLine,
  Plus,
  Send,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import { isFileSet, makeSetId, setHasAnswers, subjectKey, useQuestionBank } from "../../data/questionBankStore";
import { useTeacherClasses } from "../../data/teacherStore";
import { getSession } from "../../services/authService";
import { getFile, putFile } from "../../services/fileStore";
import { formatDate } from "../../utils/dateFormat";
import { printQuestionSet } from "../../utils/printQuestionSet";
import TeacherEmptyState from "../../components/teacher/TeacherEmptyState";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import Button from "../../components/ui/Button";
import Dialog from "../../components/ui/Dialog";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

const DEFAULT_SUBJECTS = ["Mathematics", "Science", "English", "Reading", "Art", "Sports"];
const OPTION_COUNT = 4;
const MAX_COMMENT = 500;
const MAX_FILE_MB = 10;

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Starts a browser download for a Blob.
const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

const safeName = (value) => String(value ?? "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

const textareaClass =
  "w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

let draftCounter = 0;
const blankQuestion = () => ({
  key: `d${draftCounter++}`,
  type: "mcq",
  text: "",
  options: Array(OPTION_COUNT).fill(""),
  correct: 0,
  answer: "",
});

// ---------------------------------------------------------------- publish form
function PublishForm({ subjects, defaultSubject, authorName, onSubmit, onBack }) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(defaultSubject);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState(() => [blankQuestion()]);
  const [noAnswers, setNoAnswers] = useState(false);
  const [errors, setErrors] = useState({ questions: {} });
  const listId = "bank-subjects";

  const patchQuestion = (key, changes) => {
    setQuestions((list) => list.map((q) => (q.key === key ? { ...q, ...changes } : q)));
    setErrors((e) => ({ ...e, questions: { ...e.questions, [key]: "" } }));
  };
  const setOption = (key, index, value) =>
    setQuestions((list) =>
      list.map((q) => (q.key === key ? { ...q, options: q.options.map((o, i) => (i === index ? value : o)) } : q)),
    );

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = { questions: {} };
    if (!subject.trim()) next.subject = t("teacher.bank.errors.subjectRequired");
    if (!title.trim()) next.title = t("teacher.bank.errors.titleRequired");

    const cleaned = [];
    questions.forEach((q) => {
      const text = q.text.trim();
      if (!text) {
        next.questions[q.key] = t("teacher.bank.errors.questionRequired");
        return;
      }
      if (q.type === "descriptive") {
        cleaned.push({ type: "descriptive", text, options: [], correct: 0, answer: noAnswers ? "" : q.answer.trim() });
        return;
      }
      // Keep only the filled options and re-map the correct one.
      const kept = q.options.map((o, i) => ({ text: o.trim(), i })).filter((o) => o.text);
      const correctPos = kept.findIndex((o) => o.i === q.correct);
      if (kept.length < 2) next.questions[q.key] = t("teacher.bank.errors.optionsRequired");
      else if (!noAnswers && correctPos === -1) next.questions[q.key] = t("teacher.bank.errors.correctRequired");
      else cleaned.push({ type: "mcq", text, options: kept.map((o) => o.text), correct: noAnswers ? -1 : correctPos, answer: "" });
    });

    if (next.subject || next.title || Object.values(next.questions).some(Boolean)) {
      setErrors(next);
      return;
    }
    onSubmit({ subject, title, questions: cleaned, hasAnswers: !noAnswers });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="rounded-xl bg-muted px-3 py-2 text-sm font-bold text-foreground" dir="auto">
        {t("teacher.bank.publishAs", { name: authorName })}
      </p>

      <Input
        label={`${t("teacher.bank.subjectLabel")} *`}
        value={subject}
        onChange={(e) => {
          setSubject(e.target.value);
          setErrors((er) => ({ ...er, subject: "" }));
        }}
        list={listId}
        placeholder={t("teacher.bank.subjectPlaceholder")}
        error={errors.subject}
        maxLength={60}
        dir="auto"
        autoComplete="off"
      />
      <datalist id={listId}>
        {subjects.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <Input
        label={`${t("teacher.bank.setTitleLabel")} *`}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setErrors((er) => ({ ...er, title: "" }));
        }}
        placeholder={t("teacher.bank.setTitlePlaceholder")}
        error={errors.title}
        maxLength={80}
        dir="auto"
      />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted p-3">
        <input
          type="checkbox"
          checked={noAnswers}
          onChange={(e) => setNoAnswers(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
        />
        <span>
          <span className="block font-bold text-foreground">{t("teacher.bank.noAnswersLabel")}</span>
          <span className="block text-sm text-muted-foreground">{t("teacher.bank.noAnswersHint")}</span>
        </span>
      </label>

      <div className="space-y-4">
        {questions.map((q, index) => (
          <fieldset key={q.key} className="space-y-3 rounded-2xl border border-border bg-muted p-4">
            <legend className="sr-only">{t("teacher.bank.questionN", { n: index + 1 })}</legend>
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-foreground">{t("teacher.bank.questionN", { n: index + 1 })}</p>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setQuestions((list) => list.filter((x) => x.key !== q.key))}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-red-600 hover:bg-card dark:text-red-400"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  {t("teacher.bank.removeQuestion")}
                </button>
              )}
            </div>

            <Select
              label={t("teacher.bank.typeLabel")}
              value={q.type}
              onChange={(e) => patchQuestion(q.key, { type: e.target.value })}
            >
              <option value="mcq">{t("teacher.bank.typeMcq")}</option>
              <option value="descriptive">{t("teacher.bank.typeDescriptive")}</option>
            </Select>

            <div>
              <label htmlFor={`${q.key}-text`} className="mb-1.5 block text-sm font-bold text-foreground">
                {t("teacher.bank.questionText")} *
              </label>
              <textarea
                id={`${q.key}-text`}
                rows={2}
                value={q.text}
                onChange={(e) => patchQuestion(q.key, { text: e.target.value })}
                className={textareaClass}
                dir="auto"
              />
            </div>

            {q.type === "mcq" ? (
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">
                  {noAnswers ? t("teacher.bank.optionsHintNoAnswers") : t("teacher.bank.optionsHint")}
                </p>
                {q.options.map((option, i) => (
                  <label key={i} className="flex items-center gap-3">
                    {!noAnswers && (
                      <input
                        type="radio"
                        name={`${q.key}-correct`}
                        checked={q.correct === i}
                        onChange={() => patchQuestion(q.key, { correct: i })}
                        className="h-4 w-4 shrink-0 accent-primary"
                        aria-label={t("teacher.bank.markCorrect", { n: i + 1 })}
                      />
                    )}
                    <input
                      value={option}
                      onChange={(e) => setOption(q.key, i, e.target.value)}
                      placeholder={t("teacher.bank.optionN", { n: i + 1 })}
                      className={`${textareaClass} py-2`}
                      dir="auto"
                    />
                  </label>
                ))}
              </div>
            ) : !noAnswers ? (
              <div>
                <label htmlFor={`${q.key}-answer`} className="mb-1.5 block text-sm font-bold text-foreground">
                  {t("teacher.bank.modelAnswer")} ({t("common.optional")})
                </label>
                <textarea
                  id={`${q.key}-answer`}
                  rows={2}
                  value={q.answer}
                  onChange={(e) => patchQuestion(q.key, { answer: e.target.value })}
                  className={textareaClass}
                  dir="auto"
                />
              </div>
            ) : null}

            {errors.questions[q.key] && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {errors.questions[q.key]}
              </p>
            )}
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowBack />
          {t("teacher.bank.back")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setQuestions((list) => [...list, blankQuestion()])}>
          <Plus size={18} aria-hidden="true" />
          {t("teacher.bank.addQuestion")}
        </Button>
        <Button type="submit" variant="primary">
          {t("teacher.bank.submit")}
        </Button>
      </div>
    </form>
  );
}

// Back arrow that follows the reading direction.
function ArrowBack() {
  return <span aria-hidden="true" className="inline-block rtl:-scale-x-100">←</span>;
}

// ------------------------------------------------------------ choose method
function ChooseMethod({ onChoose }) {
  const { t } = useTranslation();
  const options = [
    ["file", Upload, t("teacher.bank.chooseUpload"), t("teacher.bank.chooseUploadText")],
    ["type", PencilLine, t("teacher.bank.chooseType"), t("teacher.bank.chooseTypeText")],
  ];

  return (
    <div>
      <p className="mb-4 font-bold text-foreground">{t("teacher.bank.chooseTitle")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(([id, Icon, title, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChoose(id)}
            className="flex flex-col items-start gap-3 rounded-2xl border-2 border-border bg-card p-5 text-start transition-colors hover:border-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon size={24} aria-hidden="true" />
            </span>
            <span className="text-lg font-black text-foreground">{title}</span>
            <span className="text-sm text-muted-foreground">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------- upload form
function FileUploadForm({ subjects, defaultSubject, authorName, onSubmit, onBack }) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(defaultSubject);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const listId = "bank-subjects-file";

  const pick = async (event) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    const fail = (key) => setErrors((e) => ({ ...e, file: t(key) }));

    if (picked.size > MAX_FILE_MB * 1024 * 1024) return fail("teacher.bank.errors.fileTooBig");
    // A real PDF starts with "%PDF" — the extension alone can be wrong.
    const head = await picked.slice(0, 5).text();
    if (!head.startsWith("%PDF")) return fail("teacher.bank.errors.fileType");

    setFile(picked);
    setErrors((e) => ({ ...e, file: "" }));
    // Nothing to type: the file name becomes the title until the teacher changes it.
    if (!title.trim()) setTitle(picked.name.replace(/\.pdf$/i, ""));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!subject.trim()) next.subject = t("teacher.bank.errors.subjectRequired");
    if (!title.trim()) next.title = t("teacher.bank.errors.titleRequired");
    if (!file) next.file = t("teacher.bank.errors.fileRequired");
    if (Object.keys(next).length) return setErrors(next);
    setSaving(true);
    await onSubmit({ subject, title, file });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="rounded-xl bg-muted px-3 py-2 text-sm font-bold text-foreground" dir="auto">
        {t("teacher.bank.publishAs", { name: authorName })}
      </p>

      <div>
        <p className="mb-1.5 text-sm font-bold text-foreground">{t("teacher.bank.fileLabel")} *</p>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={pick} className="sr-only" tabIndex={-1} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted px-4 py-8 text-center transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {file ? (
            <>
              <FileText size={32} className="text-primary" aria-hidden="true" />
              <span className="break-all font-black text-foreground" dir="auto">{file.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatSize(file.size)} · {t("teacher.bank.changeFile")}
              </span>
            </>
          ) : (
            <>
              <Upload size={32} className="text-primary" aria-hidden="true" />
              <span className="font-black text-foreground">{t("teacher.bank.chooseFile")}</span>
              <span className="text-sm text-muted-foreground">{t("teacher.bank.fileHint", { size: MAX_FILE_MB })}</span>
            </>
          )}
        </button>
        {errors.file && (
          <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {errors.file}
          </p>
        )}
      </div>

      <Input
        label={`${t("teacher.bank.subjectLabel")} *`}
        value={subject}
        onChange={(e) => {
          setSubject(e.target.value);
          setErrors((er) => ({ ...er, subject: "" }));
        }}
        list={listId}
        placeholder={t("teacher.bank.subjectPlaceholder")}
        error={errors.subject}
        maxLength={60}
        dir="auto"
        autoComplete="off"
      />
      <datalist id={listId}>
        {subjects.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <Input
        label={`${t("teacher.bank.setTitleLabel")} *`}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setErrors((er) => ({ ...er, title: "" }));
        }}
        placeholder={t("teacher.bank.setTitlePlaceholder")}
        error={errors.title}
        maxLength={80}
        dir="auto"
      />

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowBack />
          {t("teacher.bank.back")}
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {t("teacher.bank.submit")}
        </Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ set card
function SetCard({ set, me, onDelete, onDownload, onView, onAddComment, onDeleteComment }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const mine = Boolean(me.id) && set.authorId === me.id;
  const fileSet = isFileSet(set);
  const answers = setHasAnswers(set);

  const download = (withAnswers) =>
    onDownload(set, withAnswers);

  const send = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return setError(t("teacher.bank.errors.commentRequired"));
    if (text.length > MAX_COMMENT) return setError(t("teacher.bank.errors.commentTooLong"));
    onAddComment(set.id, text);
    setDraft("");
    setError("");
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary" dir="auto">
              {set.subject}
            </span>
            {fileSet && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-foreground">
                {t("teacher.bank.fileBadge")}
              </span>
            )}
            {!fileSet && !answers && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-foreground">
                {t("teacher.bank.noAnswersBadge")}
              </span>
            )}
            {mine && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700 dark:bg-green-500/15 dark:text-green-300">
                {t("teacher.bank.mineBadge")}
              </span>
            )}
          </div>
          <h2 className="mt-2 break-words text-xl font-black text-foreground" dir="auto">
            {set.title}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-bold" dir="auto">
              <UserRound size={14} aria-hidden="true" />
              {t("teacher.bank.by", { name: set.authorName })}
            </span>
            <span>{formatDate(set.createdAt, i18n.language)}</span>
            {fileSet ? (
              <span>{formatSize(set.file?.size ?? 0)}</span>
            ) : (
              <span>{t("teacher.bank.questionCount", { count: set.questions.length })}</span>
            )}
          </p>
        </div>
        {mine && (
          <Button variant="outline" size="sm" onClick={() => onDelete(set)}>
            <Trash2 size={16} aria-hidden="true" />
            {t("teacher.bank.delete")}
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {fileSet ? (
          <>
            <Button variant="primary" size="sm" onClick={() => download(false)}>
              <Download size={16} aria-hidden="true" />
              {t("teacher.bank.downloadFile")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onView(set)}>
              <Eye size={16} aria-hidden="true" />
              {t("teacher.bank.viewFile")}
            </Button>
            <span className="min-w-0 break-all text-sm text-muted-foreground" dir="auto">
              {set.file?.name}
            </span>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted/70"
            >
              <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
              {open ? t("teacher.bank.hideQuestions") : t("teacher.bank.showQuestions")}
            </button>
            <Button variant="outline" size="sm" onClick={() => download(false)}>
              <Download size={16} aria-hidden="true" />
              {t("teacher.bank.downloadPdf")}
            </Button>
            {answers && (
              <Button variant="outline" size="sm" onClick={() => download(true)}>
                <FileText size={16} aria-hidden="true" />
                {t("teacher.bank.downloadPdfAnswers")}
              </Button>
            )}
          </>
        )}
      </div>

      {open && !fileSet && (
        <ol className="mt-4 space-y-3">
          {set.questions.map((q, index) => (
            <li key={q.id} className="rounded-2xl border border-border bg-muted p-4">
              <p className="flex items-start gap-2 font-bold text-foreground" dir="auto">
                <span className="shrink-0 text-primary">{index + 1}.</span>
                <span className="min-w-0 break-words">{q.text}</span>
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {q.type === "mcq" ? t("teacher.bank.typeMcq") : t("teacher.bank.typeDescriptive")}
              </p>
              {q.type === "mcq" ? (
                <ul className="mt-3 space-y-1.5">
                  {q.options.map((option, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                        answers && i === q.correct
                          ? "bg-green-100 font-bold text-green-800 dark:bg-green-500/15 dark:text-green-200"
                          : "bg-card text-foreground"
                      }`}
                      dir="auto"
                    >
                      {answers && i === q.correct && <Check size={14} className="shrink-0" aria-label={t("teacher.bank.correctAnswer")} />}
                      <span className="min-w-0 break-words">{option}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                q.answer && (
                  <p className="mt-3 rounded-xl bg-card px-3 py-2 text-sm text-foreground" dir="auto">
                    <span className="font-bold">{t("teacher.bank.modelAnswer")}: </span>
                    {q.answer}
                  </p>
                )
              )}
            </li>
          ))}
        </ol>
      )}

      <section className="mt-5 border-t border-border pt-4" aria-label={t("teacher.bank.commentsTitle", { count: set.comments.length })}>
        <h3 className="flex items-center gap-2 font-black text-foreground">
          <MessageSquare size={18} className="text-primary" aria-hidden="true" />
          {t("teacher.bank.commentsTitle", { count: set.comments.length })}
        </h3>

        {set.comments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("teacher.bank.noComments")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {set.comments.map((c) => (
              <li key={c.id} className="rounded-xl bg-muted px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-black text-foreground" dir="auto">
                    {c.authorName}
                    {c.authorId === set.authorId && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black text-primary">
                        {t("teacher.bank.authorBadge")}
                      </span>
                    )}
                    <span className="text-xs font-normal text-muted-foreground">{formatDate(c.createdAt, i18n.language)}</span>
                  </p>
                  {me.id && c.authorId === me.id && (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(set.id, c.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-card hover:text-red-600"
                      aria-label={t("teacher.bank.deleteComment")}
                      title={t("teacher.bank.deleteComment")}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground" dir="auto">
                  {c.text}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={send} noValidate className="mt-3 space-y-2">
          <label htmlFor={`comment-${set.id}`} className="sr-only">
            {t("teacher.bank.commentPlaceholder")}
          </label>
          <textarea
            id={`comment-${set.id}`}
            rows={2}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            placeholder={t("teacher.bank.commentPlaceholder")}
            className={textareaClass}
            dir="auto"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="sm">
            <Send size={16} className="rtl:-scale-x-100" aria-hidden="true" />
            {t("teacher.bank.send")}
          </Button>
        </form>
      </section>
    </article>
  );
}

// ---------------------------------------------------------------------- page
export default function TeacherQuestionBankPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes } = useTeacherClasses();
  const { sets, addSet, deleteSet, addComment, deleteComment } = useQuestionBank();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState({ id: "", name: mockTeacher.name });
  const [tab, setTab] = useState("all");
  const [publishing, setPublishing] = useState(null); // null | "choose" | "type" | "file"
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  // The signed-in teacher publishes and comments under their own name.
  useEffect(() => {
    getSession().then((session) =>
      setMe({
        id: session?.userId ?? "",
        name: session?.user?.name ?? mockTeacher.name,
      }),
    );
  }, []);

  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  // Subjects = lessons of the teacher's classes + every subject already in the bank.
  const subjects = useMemo(() => {
    const seen = new Map();
    const add = (name) => {
      const key = subjectKey(name);
      if (key && !seen.has(key)) seen.set(key, String(name).trim());
    };
    classes.forEach((cls) => cls.lessons.forEach((lesson) => add(lesson.title)));
    sets.forEach((s) => add(s.subject));
    DEFAULT_SUBJECTS.forEach(add);
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [classes, sets]);

  const subject = searchParams.get("subject") ?? "";
  const subjectCount = (name) => sets.filter((s) => subjectKey(s.subject) === subjectKey(name)).length;

  const visible = sets
    .filter((s) => !subject || subjectKey(s.subject) === subjectKey(subject))
    .filter((s) => (tab === "mine" ? s.authorId === me.id : tab === "others" ? s.authorId !== me.id : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const changeSubject = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("subject", value);
    else next.delete("subject");
    setSearchParams(next, { replace: true });
  };

  const handlePublish = ({ subject: chosen, title, questions, hasAnswers }) => {
    addSet({ subject: chosen, title, questions, hasAnswers, authorId: me.id, authorName: me.name });
    setPublishing(null);
    changeSubject(chosen.trim());
    setTab("all");
    notify(t("teacher.bank.published"));
  };

  const handlePublishFile = async ({ subject: chosen, title, file }) => {
    const id = makeSetId();
    try {
      await putFile(id, file);
    } catch {
      notify(t("teacher.bank.errors.fileSaveFailed"));
      return;
    }
    addSet({
      id,
      kind: "file",
      subject: chosen,
      title,
      file: { name: file.name, size: file.size },
      authorId: me.id,
      authorName: me.name,
    });
    setPublishing(null);
    changeSubject(chosen.trim());
    setTab("all");
    notify(t("teacher.bank.published"));
  };

  const loadFile = async (set) => {
    const blob = await getFile(set.id).catch(() => null);
    if (!blob) notify(t("teacher.bank.fileMissing"));
    return blob;
  };

  const handleViewFile = async (set) => {
    const blob = await loadFile(set);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  // Opens the print dialog with an A4 layout; "Save as PDF" there downloads the file.
  const handleDownload = async (set, withAnswers) => {
    if (isFileSet(set)) {
      const blob = await loadFile(set);
      if (blob) saveBlob(blob, `${safeName(`${set.subject} - ${set.title}`) || "questions"}.pdf`);
      return;
    }
    const lang = i18n.language;
    const dir = i18n.dir(lang);
    try {
      notify(t("teacher.bank.pdfPreparing"));
      await printQuestionSet({
        set,
        lang,
        dir,
        withAnswers,
        dateText: formatDate(set.createdAt, lang),
        labels: {
          brand: t("brand"),
          by: t("teacher.bank.by", { name: set.authorName }),
          count: t("teacher.bank.questionCount", { count: set.questions.length }),
          answerKey: t("teacher.bank.pdfAnswerKey"),
          modelAnswer: t("teacher.bank.modelAnswer"),
          studentName: t("teacher.bank.pdfStudentName"),
          className: t("teacher.bank.pdfClass"),
          date: t("teacher.bank.pdfDate"),
          score: t("teacher.bank.pdfScore"),
        },
      });
    } catch {
      notify(t("teacher.bank.pdfError"));
    }
  };

  const tabs = [
    ["all", t("teacher.bank.tabAll")],
    ["mine", t("teacher.bank.tabMine")],
    ["others", t("teacher.bank.tabOthers")],
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <TeacherTopbar teacher={mockTeacher} onToggleMobileMenu={() => setMobileOpen((v) => !v)} />

        <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <LibraryBig size={28} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-black text-foreground">{t("teacher.bank.title")}</h1>
                <p className="mt-1 text-muted-foreground">{t("teacher.bank.subtitle")}</p>
              </div>
            </div>
            <Button variant="primary" onClick={() => setPublishing("choose")}>
              <Plus size={18} aria-hidden="true" />
              {t("teacher.bank.publish")}
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Select label={t("teacher.bank.subjectFilter")} value={subject} onChange={(e) => changeSubject(e.target.value)}>
              <option value="">{t("teacher.bank.allSubjects")}</option>
              {subjects.map((name) => (
                <option key={name} value={name}>
                  {t("teacher.bank.subjectWithCount", { name, count: subjectCount(name) })}
                </option>
              ))}
              {/* A subject from the URL that is not in the list yet. */}
              {subject && !subjects.some((s) => subjectKey(s) === subjectKey(subject)) && (
                <option value={subject}>{subject}</option>
              )}
            </Select>

            <div role="tablist" className="flex gap-1 rounded-xl bg-muted p-1">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                    tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {visible.length === 0 ? (
              <TeacherEmptyState
                icon={LibraryBig}
                title={t("teacher.bank.emptyTitle")}
                description={t("teacher.bank.emptyText")}
                actionLabel={t("teacher.bank.publish")}
                onAction={() => setPublishing("choose")}
              />
            ) : (
              visible.map((set) => (
                <SetCard
                  key={set.id}
                  set={set}
                  me={me}
                  onDelete={setDeleting}
                  onDownload={handleDownload}
                  onView={handleViewFile}
                  onAddComment={(setId, text) => {
                    addComment(setId, { text, authorId: me.id, authorName: me.name });
                    notify(t("teacher.bank.commentAdded"));
                  }}
                  onDeleteComment={(setId, commentId) => {
                    deleteComment(setId, commentId);
                    notify(t("teacher.bank.commentDeleted"));
                  }}
                />
              ))
            )}
          </div>
        </main>
      </div>

      <Dialog
        open={Boolean(publishing)}
        onClose={() => setPublishing(null)}
        title={publishing === "file" ? t("teacher.bank.uploadFormTitle") : t("teacher.bank.formTitle")}
        size={publishing === "type" ? "lg" : "md"}
      >
        {publishing === "choose" && <ChooseMethod onChoose={setPublishing} />}
        {publishing === "file" && (
          <FileUploadForm
            subjects={subjects}
            defaultSubject={subject}
            authorName={me.name}
            onSubmit={handlePublishFile}
            onBack={() => setPublishing("choose")}
          />
        )}
        {publishing === "type" && (
          <PublishForm
            subjects={subjects}
            defaultSubject={subject}
            authorName={me.name}
            onSubmit={handlePublish}
            onBack={() => setPublishing("choose")}
          />
        )}
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} title={t("teacher.bank.deleteTitle")} size="sm">
        <p className="text-muted-foreground" dir="auto">
          {t("teacher.bank.deleteText", { title: deleting?.title ?? "" })}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteSet(deleting.id);
              setDeleting(null);
              notify(t("teacher.bank.deleted"));
            }}
          >
            {t("teacher.bank.delete")}
          </Button>
        </div>
      </Dialog>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 z-[70] flex max-w-[calc(100vw-2rem)] items-center rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background shadow-xl [inset-inline-end:1rem]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
