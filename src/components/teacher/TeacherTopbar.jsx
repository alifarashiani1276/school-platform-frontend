import { Bell, HelpCircle, KeyRound, LogOut, Menu, School, Settings, ShieldCheck, User, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { getSession, logout } from "../../services/authService";
import ChangePasswordDialog from "../admin/ChangePasswordDialog";
import useSchoolData from "../../hooks/useSchoolData";
import DropdownMenu, { DropdownMenuItem } from "../ui/DropdownMenu";
import LanguageSwitcher from "../LanguageSwitcher";
import ThemeSwitcher from "../ThemeSwitcher";

const roundBtn =
  "grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-muted";

// A topbar icon that opens a small info popover (safety / notifications / help).
function InfoPopover({ icon: Icon, label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={roundBtn} aria-label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="fixed end-3 top-[68px] z-40 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-4 shadow-xl sm:absolute sm:end-0 sm:top-12"
        >
          <p className="mb-1 font-black text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{children}</p>
        </div>
      )}
    </div>
  );
}

export default function TeacherTopbar({ teacher: baseTeacher, onToggleMobileMenu }) {
  const { t, i18n } = useTranslation();
  const [sessionName, setSessionName] = useState(null);
  const [sessionUserId, setSessionUserId] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const schoolData = useSchoolData();

  // Show the signed-in teacher's own name instead of the mock one.
  useEffect(() => {
    getSession().then((session) => {
      setSessionName(session?.user?.name ?? null);
      setSessionUserId(session?.role === "teacher" ? session.userId : null);
    });
  }, []);
  const account = (schoolData.teachers || []).find((item) => item.id === sessionUserId);
  const teacher = sessionName ? { ...baseTeacher, name: sessionName } : baseTeacher;
  const navigate = useNavigate();
  const balance = Number(teacher?.balance ?? 0);

  const handleSignOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <>
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className={`${roundBtn} lg:hidden`}
          aria-label={t("teacher.topbar.openMenu")}
        >
          <Menu size={18} aria-hidden="true" />
        </button>
        <School size={24} className="shrink-0 text-primary" aria-label={t("teacher.topbar.school")} role="img" />
        <p className="hidden min-w-0 truncate text-sm font-bold text-foreground md:block" dir="auto">
          {teacher.school}
        </p>
      </div>

      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
        <Link
          to="/teacher/wallet"
          className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary/10 md:inline-flex"
        >
          <Wallet size={16} className="shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">
            {t("teacher.wallet.creditLabel")}: {balance.toLocaleString(i18n.language)} {t(teacher.currencyKey)}
          </span>
        </Link>

        <InfoPopover icon={ShieldCheck} label={t("teacher.topbar.safety")}>
          {t("teacher.topbar.safetyText")}
        </InfoPopover>
        <InfoPopover icon={Bell} label={t("teacher.topbar.notifications")}>
          {t("teacher.topbar.notificationsEmpty")}
        </InfoPopover>
        <InfoPopover icon={HelpCircle} label={t("teacher.topbar.help")}>
          {t("teacher.topbar.helpText")}
        </InfoPopover>

        <DropdownMenu
          label={t("teacher.topbar.profile")}
          className="w-72"
          trigger={
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              aria-label={t("teacher.topbar.profile")}
            >
              {teacher.name.charAt(0).toUpperCase()}
            </button>
          }
        >
          <div className="mb-2 border-b border-border px-3 pb-2">
            <p className="break-words font-bold text-foreground">{teacher.name}</p>
            <p className="break-all text-xs text-muted-foreground">{teacher.email}</p>
          </div>

          <DropdownMenuItem icon={User} onClick={() => navigate("/teacher/profile")}>
            {t("teacher.topbar.profile")}
          </DropdownMenuItem>
          <DropdownMenuItem icon={Settings} onClick={() => navigate("/teacher/settings")}>
            {t("teacher.topbar.settings")}
          </DropdownMenuItem>
          {account && (
            <DropdownMenuItem icon={KeyRound} onClick={() => setPasswordOpen(true)}>
              {t("teacher.topbar.changePassword")}
            </DropdownMenuItem>
          )}

          <div className="space-y-2 border-t border-border px-1 pt-2">
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-sm font-bold">{t("teacher.topbar.language")}</span>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-sm font-bold">{t("teacher.topbar.theme")}</span>
              <ThemeSwitcher />
            </div>
          </div>

          <div className="my-1 border-t border-border" />
          <DropdownMenuItem icon={LogOut} danger onClick={handleSignOut}>
            {t("teacher.topbar.signOut")}
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </header>
    {account?.mustChangePassword && (
      <div
        role="alert"
        className="flex flex-col gap-3 border-b border-amber-500/40 bg-amber-100 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-500/15 dark:text-amber-200"
      >
        <span>{t("teacher.topbar.mustChangePassword")}</span>
        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="rounded-xl bg-amber-600 px-4 py-2 font-bold text-white"
        >
          {t("teacher.topbar.changePassword")}
        </button>
      </div>
    )}
    <ChangePasswordDialog
      open={passwordOpen}
      onClose={() => setPasswordOpen(false)}
      onDone={() => window.alert(t("teacher.topbar.passwordChanged"))}
    />
    </>

  );
}
