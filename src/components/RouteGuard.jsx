import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getSession, logout } from "../services/authService";

const ROLE_HOME = { superadmin: "/super", admin: "/admin", teacher: "/teacher", parent: "/parent" };

export default function RouteGuard({ allowedRole, children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const currentSession = await getSession();
      if (!isMounted) return;
      setSession(currentSession);
      setLoading(false);
    };

    syncSession();
    window.addEventListener("school:storage", syncSession);

    return () => {
      isMounted = false;
      window.removeEventListener("school:storage", syncSession);
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (session.role !== allowedRole) {
    // Signed in as a different role: explain instead of redirecting to /login,
    // which used to send the user straight back here in an endless loop.
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-lg">
          <h1 className="text-2xl font-black">{t("auth.wrongRoleTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.wrongRoleText", { role: t(`roles.${session.role}.title`) })}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to={ROLE_HOME[session.role] || "/"}
              className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"
            >
              {t("auth.goToMyPanel")}
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true, state: { from: location.pathname } });
              }}
              className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-black hover:bg-muted"
            >
              {t("auth.switchAccount")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
