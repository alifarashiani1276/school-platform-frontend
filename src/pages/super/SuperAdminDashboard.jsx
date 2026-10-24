import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  School,
  Settings,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PanelHeader from "../../components/panel/PanelHeader";
import Dialog from "../../components/ui/Dialog";
import {
  changeSchoolStatus,
  createSchoolWithAdmin,
  listSchoolsForSuperAdmin,
  resetAdminPassword,
  resetTeacherPassword,
} from "../../services/schoolRegistry";
import { subscribeToStorage } from "../../services/storage";
import { formatDate } from "../../utils/dateFormat";

const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  rejected: "bg-muted text-muted-foreground",
};

const fieldClass =
  "w-full rounded-2xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const EMPTY_FORM = { schoolName: "", city: "", managerName: "", mobile: "" };

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation();
  const num = (n) => Number(n ?? 0).toLocaleString(i18n.language);
  const [tab, setTab] = useState("requests");
  const [schools, setSchools] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null); // { kind: "ok" | "error", text }
  // Password reset dialog: { school, admin, password } (password set after reset).
  const [reset, setReset] = useState(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    try {
      setSchools(listSchoolsForSuperAdmin());
    } catch {
      setSchools([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToStorage(refresh);
  }, [refresh]);

  const pending = schools.filter((s) => s.status === "pending");
  const count = (status) => schools.filter((s) => s.status === status).length;

  const act = (school, action) => {
    if (action === "reject" && !window.confirm(t("super.confirm.reject"))) return;
    if (action === "suspend" && !window.confirm(t("super.confirm.suspend"))) return;
    try {
      changeSchoolStatus(school.id, action);
      setMessage(null);
      refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: t(`registry.errors.${error.code || "forbidden"}`),
      });
    }
  };

  const confirmReset = async () => {
    try {
      const doReset =
        reset.kind === "teacher" ? resetTeacherPassword : resetAdminPassword;
      const { temporaryPassword } = await doReset(reset.admin.id);
      setReset((prev) => ({ ...prev, password: temporaryPassword }));
      setCopied(false);
      refresh();
    } catch (error) {
      setReset(null);
      setMessage({
        kind: "error",
        text: t(`registry.errors.${error.code || "forbidden"}`),
      });
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(reset.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const submitCreate = (event) => {
    event.preventDefault();
    try {
      createSchoolWithAdmin(form);
      setForm(EMPTY_FORM);
      setMessage({ kind: "ok", text: t("super.create.done") });
      setTab("schools");
      refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: t(`registry.errors.${error.code || "invalidInput"}`),
      });
    }
  };

  const setField = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const tabs = [
    ["requests", t("super.tab.requests"), pending.length],
    ["schools", t("super.tab.schools"), schools.length],
    ["create", t("super.tab.create"), null],
  ];

  const actionsFor = (school) =>
    ({
      pending: ["approve", "reject"],
      rejected: ["approve"],
      active: ["suspend"],
      suspended: ["reactivate"],
    })[school.status] ?? [];

  const SchoolCard = ({ school }) => {
    const expanded = openId === school.id;
    const stats = [
      ["teachers", school.stats.teachers],
      ["activeTeachers", school.stats.activeTeachers],
      ["students", school.stats.students],
      ["parents", school.stats.parents],
      ["classes", school.stats.classes],
      ["courses", school.stats.courses],
      ["grades", school.stats.grades],
      ["attendance", school.stats.attendance],
    ];
    return (
      <li className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-black" dir="auto">
              {school.name}
              {school.city ? ` · ${school.city}` : ""}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground" dir="auto">
              {t("super.manager")}:{" "}
              {school.admins.map((a) => a.name).join("، ") || "—"}
              {school.admins[0] && (
                <span dir="ltr"> · {school.admins[0].mobile}</span>
              )}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[school.status] ?? STATUS_STYLE.rejected}`}
          >
            {t(`super.status.${school.status}`)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {actionsFor(school).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => act(school, action)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                action === "reject" || action === "suspend"
                  ? "border border-red-500/40 text-red-600 hover:bg-red-500/10"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {t(`super.action.${action}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpenId(expanded ? null : school.id)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-muted"
          >
            {expanded ? t("super.action.hideStats") : t("super.action.showStats")}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {expanded && (
          <div className="mt-4">
            <section className="mb-5 rounded-2xl border border-border bg-muted p-4">
              <h4 className="mb-3 text-sm font-black">{t("super.managerTitle")}</h4>
              {school.admins.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-2">
                  {school.admins.map((admin) => (
                    <li
                      key={admin.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-bold" dir="auto">
                          {admin.name}
                        </p>
                        <p className="text-sm text-muted-foreground" dir="ltr">
                          {admin.mobile}
                        </p>
                        {admin.passwordResetAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("super.reset.lastReset")}:{" "}
                            {formatDate(admin.passwordResetAt, i18n.language)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setReset({ school, admin, kind: "admin", password: null })
                        }
                        title={t("super.reset.button")}
                        aria-label={`${t("super.reset.button")}: ${admin.name}`}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border hover:border-primary hover:text-primary"
                      >
                        <Settings size={18} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mb-5 rounded-2xl border border-border bg-muted p-4">
              <h4 className="mb-3 text-sm font-black">
                {t("super.teachers.title")} ({num(school.teachers.length)})
              </h4>
              {school.teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("super.teachers.none")}</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full min-w-[420px] text-start text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="p-3 text-start">{t("super.teachers.name")}</th>
                        <th className="p-3 text-start">{t("super.teachers.mobile")}</th>
                        <th className="p-3 text-start">{t("super.teachers.subject")}</th>
                        <th className="p-3 text-start">{t("super.teachers.status")}</th>
                        <th className="p-3 text-start">
                          <span className="sr-only">{t("super.reset.buttonTeacher")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {school.teachers.map((teacher) => (
                        <tr key={teacher.id} className="border-b border-border last:border-0">
                          <td className="p-3 font-bold" dir="auto">{teacher.name}</td>
                          <td className="p-3" dir="ltr">{teacher.mobile || "—"}</td>
                          <td className="p-3" dir="auto">{teacher.subject || "—"}</td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${
                                teacher.active ? STATUS_STYLE.active : STATUS_STYLE.rejected
                              }`}
                            >
                              {t(teacher.active ? "super.status.active" : "super.status.suspended")}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() =>
                                setReset({ school, admin: teacher, kind: "teacher", password: null })
                              }
                              title={t("super.reset.buttonTeacher")}
                              aria-label={`${t("super.reset.buttonTeacher")}: ${teacher.name}`}
                              className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-primary hover:text-primary"
                            >
                              <Settings size={16} aria-hidden="true" />
                            </button>
                            {teacher.passwordResetAt && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(teacher.passwordResetAt, i18n.language)}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-border bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{t(`super.stat.${key}`)}</p>
                  <p className="mt-1 text-xl font-black">{num(value)}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t("super.stat.created")}</p>
                <p className="mt-1 text-sm font-black">
                  {school.createdAt ? formatDate(school.createdAt, i18n.language) : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t("super.stat.approved")}</p>
                <p className="mt-1 text-sm font-black">
                  {school.approvedAt ? formatDate(school.approvedAt, i18n.language) : "—"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("super.statsNote")}</p>
          </div>
        )}
      </li>
    );
  };

  const Empty = ({ text }) => (
    <p className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PanelHeader icon={ShieldCheck} panelName={t("super.panelName")} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black">{t("super.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("super.text")}</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["schools", schools.length, School],
            ["active", count("active"), ShieldCheck],
            ["pending", count("pending"), Clock],
            ["suspended", count("suspended"), School],
          ].map(([key, value, Icon]) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-4">
              <Icon size={18} className="mb-2 text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{t(`super.total.${key}`)}</p>
              <p className="mt-1 text-2xl font-black">{num(value)}</p>
            </div>
          ))}
        </div>

        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label={t("super.title")}>
          {tabs.map(([id, label, badge]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setMessage(null);
              }}
              aria-current={tab === id ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
                tab === id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card hover:bg-muted"
              }`}
            >
              {id === "create" && <UserPlus size={17} aria-hidden="true" />}
              {label}
              {badge ? (
                <span className="rounded-full bg-background/30 px-2 text-xs">{num(badge)}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
              message.kind === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            {message.text}
          </p>
        )}

        {tab === "requests" &&
          (pending.length === 0 ? (
            <Empty text={t("super.noRequests")} />
          ) : (
            <ul className="space-y-4">
              {pending.map((school) => (
                <SchoolCard key={school.id} school={school} />
              ))}
            </ul>
          ))}

        {tab === "schools" &&
          (schools.length === 0 ? (
            <Empty text={t("super.noSchools")} />
          ) : (
            <ul className="space-y-4">
              {schools.map((school) => (
                <SchoolCard key={school.id} school={school} />
              ))}
            </ul>
          ))}

        {tab === "create" && (
          <section className="max-w-xl rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-black">{t("super.create.title")}</h2>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">{t("super.create.text")}</p>
            <form onSubmit={submitCreate} className="space-y-4">
              {[
                ["schoolName", "register.schoolName", "auto"],
                ["city", "register.city", "auto"],
                ["managerName", "register.managerName", "auto"],
                ["mobile", "register.mobile", "ltr"],
              ].map(([key, label, dir]) => (
                <div key={key}>
                  <label htmlFor={`super-${key}`} className="mb-1 block text-sm font-semibold">
                    {t(label)}
                  </label>
                  <input
                    id={`super-${key}`}
                    value={form[key]}
                    onChange={setField(key)}
                    dir={dir}
                    inputMode={key === "mobile" ? "tel" : undefined}
                    placeholder={key === "mobile" ? "09xxxxxxxxx" : undefined}
                    required
                    aria-required="true"
                    className={fieldClass}
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground hover:opacity-90"
              >
                {t("super.create.submit")}
              </button>
            </form>
          </section>
        )}
      </main>

      <Dialog
        open={Boolean(reset)}
        onClose={() => setReset(null)}
        title={t(reset?.kind === "teacher" ? "super.reset.titleTeacher" : "super.reset.title")}
        size="sm"
      >
        {reset && !reset.password && (
          <div className="space-y-4">
            <p className="text-sm">
              {t(reset.kind === "teacher" ? "super.reset.textTeacher" : "super.reset.text", {
                name: reset.admin.name,
                school: reset.school.name,
              })}
            </p>
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              {t(reset.kind === "teacher" ? "super.reset.warningTeacher" : "super.reset.warning")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmReset}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground"
              >
                {t("super.reset.confirm")}
              </button>
              <button
                type="button"
                onClick={() => setReset(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold"
              >
                {t("super.reset.cancel")}
              </button>
            </div>
          </div>
        )}
        {reset?.password && (
          <div className="space-y-4">
            <p className="text-sm">{t(reset.kind === "teacher" ? "super.reset.doneTeacher" : "super.reset.done", { name: reset.admin.name })}</p>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4">
              <code className="select-all break-all text-xl font-black" dir="ltr">
                {reset.password}
              </code>
              <button
                type="button"
                onClick={copyPassword}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold hover:bg-background"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t("super.reset.copied") : t("super.reset.copy")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t(reset.kind === "teacher" ? "super.reset.noteTeacher" : "super.reset.note")}</p>
            <button
              type="button"
              onClick={() => setReset(null)}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground"
            >
              {t("super.reset.close")}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
