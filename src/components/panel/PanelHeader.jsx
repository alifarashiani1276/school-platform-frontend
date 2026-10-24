import { ArrowLeft, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";
import LanguageSwitcher from "../LanguageSwitcher";
import ThemeSwitcher from "../ThemeSwitcher";

// Shared top bar for the admin and parent panels.
export default function PanelHeader({ icon: Icon, panelName }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">{t("brand")}</p>
            <p className="truncate text-xs text-muted-foreground">{panelName}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-bold transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden="true" />
            <span className="hidden sm:inline">{t("common.back_to_home")}</span>
          </Link>
          <LanguageSwitcher />
          <ThemeSwitcher />
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-bold transition hover:border-red-500 hover:text-red-600"
          >
            <LogOut size={16} className="rtl:-scale-x-100" aria-hidden="true" />
            <span className="hidden sm:inline">{t("teacher.topbar.signOut")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
