import {
  CalendarRange,
  ChevronsLeft,
  ChevronsRight,
  Grid2x2,
  HelpCircle,
  Home,
  LayoutDashboard,
  Library,
  LibraryBig,
  PlusCircle,
  School,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useTeacherClasses } from "../../data/teacherStore";

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
  accent = false,
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
        collapsed ? "lg:justify-center lg:px-0" : ""
      } ${active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/60"}`}
    >
      <Icon
        size={20}
        className={`shrink-0 ${active || accent ? "text-primary" : "text-muted-foreground"}`}
        aria-hidden="true"
      />
      <span
        className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}
      >
        {label}
      </span>
    </Link>
  );
}

export default function TeacherSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const { activeClasses } = useTeacherClasses();
  const creating = new URLSearchParams(search).has("new");

  const common = { collapsed, onClick: onCloseMobile };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={t("teacher.topbar.openMenu")}
        className={`fixed inset-y-0 start-0 z-50 flex h-screen w-[280px] max-w-[85vw] flex-col border-e border-border bg-card transition-transform duration-300 lg:sticky lg:top-0 lg:z-20 lg:max-w-none ${
          mobileOpen
            ? ""
            : "max-lg:-translate-x-full max-lg:rtl:translate-x-full"
        } ${collapsed ? "lg:w-[84px]" : "lg:w-[280px]"}`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link
            to="/"
            onClick={onCloseMobile}
            className={`flex min-w-0 items-center gap-2 ${collapsed ? "lg:hidden" : ""}`}
          >
            <img
              src="/images/logo.webp"
              alt=""
              className="h-8 w-8 shrink-0 object-contain"
            />
            <span className="truncate text-lg font-black text-primary">
              {t("brand")}
            </span>
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted lg:hidden"
            aria-label={t("common.close")}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden h-10 w-10 place-items-center rounded-lg hover:bg-muted lg:grid ${
              collapsed ? "lg:mx-auto" : ""
            }`}
            aria-label={collapsed ? t("common.expand") : t("common.collapse")}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronsRight
                size={20}
                className="rtl:-scale-x-100"
                aria-hidden="true"
              />
            ) : (
              <ChevronsLeft
                size={20}
                className="rtl:-scale-x-100"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItem
            {...common}
            to="/teacher/overview"
            icon={LayoutDashboard}
            label={t("teacher.nav.overview")}
            active={pathname === "/teacher/overview"}
          />
          <NavItem
            {...common}
            to="/teacher/join-school"
            icon={School}
            label={t("teacher.nav.joinSchool")}
            active={pathname === "/teacher/join-school"}
          />
          <NavItem
            {...common}
            to="/teacher/store"
            icon={ShoppingCart}
            label={t("teacher.nav.store")}
            active={pathname === "/teacher/store"}
          />
          <NavItem
            {...common}
            to="/teacher/wallet"
            icon={Wallet}
            label={t("teacher.wallet.title")}
            active={pathname === "/teacher/wallet"}
          />
          <NavItem
            {...common}
            to="/teacher/weekly-plan"
            icon={CalendarRange}
            label={t("teacher.nav.weeklyPlan")}
            active={pathname === "/teacher/weekly-plan"}
          />
          <NavItem
            {...common}
            to="/teacher/question-bank"
            icon={LibraryBig}
            label={t("teacher.nav.questionBank")}
            active={pathname === "/teacher/question-bank"}
          />

          <div className="pt-4">
            <p
              className={`px-3 pb-2 text-xs font-black uppercase tracking-wide text-muted-foreground ${collapsed ? "lg:hidden" : ""}`}
            >
              {t("teacher.nav.yourClasses")}
            </p>
            {collapsed && (
              <div className="mb-2 hidden border-t border-border lg:block" />
            )}

            <NavItem
              {...common}
              to="/teacher"
              icon={Grid2x2}
              label={t("teacher.nav.allClasses")}
              active={pathname === "/teacher" && !creating}
            />
            <NavItem
              {...common}
              to="/teacher?new=1"
              icon={PlusCircle}
              accent
              label={t("teacher.nav.newClass")}
              active={pathname === "/teacher" && creating}
            />

            {activeClasses.map((cls) => (
              <Link
                key={cls.id}
                to={`/teacher/class/${cls.id}`}
                onClick={onCloseMobile}
                title={cls.name}
                aria-current={
                  pathname.startsWith(`/teacher/class/${cls.id}`)
                    ? "page"
                    : undefined
                }
                className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                  collapsed ? "lg:justify-center lg:px-0" : ""
                } ${
                  pathname.startsWith(`/teacher/class/${cls.id}`)
                    ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center text-lg"
                  aria-hidden="true"
                >
                  {cls.emoji || "📚"}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${collapsed ? "lg:sr-only" : ""}`}
                  dir="auto"
                >
                  {cls.name}
                </span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="shrink-0 space-y-1 border-t border-border p-3">
          <NavItem
            {...common}
            to="/teacher/resources"
            icon={Library}
            label={t("teacher.nav.resources")}
            active={pathname === "/teacher/resources"}
          />
          <NavItem
            {...common}
            to="/teacher/support"
            icon={HelpCircle}
            label={t("teacher.nav.support")}
            active={pathname === "/teacher/support"}
          />
          <NavItem
            {...common}
            to="/"
            icon={Home}
            label={t("common.back_to_home")}
            active={false}
          />
        </div>
      </aside>
    </>
  );
}
