import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicHeader from "../components/PublicHeader";
import { getSession, login } from "../services/authService";

const roleRedirectMap = {
  superadmin: "/super",
  admin: "/admin",
  teacher: "/teacher",
  parent: "/parent",
};

// Only follow the page the user came from if it belongs to the role that just
// signed in. Otherwise the route guard would bounce them back to /login.
const resolveRedirect = (role, from) => {
  const home = roleRedirectMap[role] || "/";
  return typeof from === "string" && (from === home || from.startsWith(`${home}/`)) ? from : home;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("09120000000");
  const [otp, setOtp] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    getSession().then((currentSession) => {
      if (!active) return;
      setSession(currentSession);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (session) {
    return <Navigate to={resolveRedirect(session.role, location.state?.from)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorCode("");

    try {
      const nextSession = await login({ mobile, otp });
      setSession(nextSession);
      navigate(resolveRedirect(nextSession.role, location.state?.from), { replace: true });
    } catch (loginError) {
      setErrorCode(loginError.code || "generic");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full rounded-2xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/5">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">{t("auth.panelLabel")}</p>
            <h1 className="mt-3 text-3xl font-black">{t("auth.loginTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-mobile" className="mb-1 block text-sm font-semibold">{t("auth.mobile")}</label>
              <input
                id="login-mobile"
                dir="ltr"
                inputMode="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="09120000000"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="login-otp" className="mb-1 block text-sm font-semibold">{t("auth.otp")}</label>
              <input
                id="login-otp"
                dir="ltr"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="123456"
                className={fieldClass}
              />
            </div>

            <div className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
              {t("auth.demoCode", { code: "123456" })}
            </div>

            {errorCode ? (
              <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {t(`auth.errors.${errorCode}`)}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("auth.checking") : t("auth.submit")}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p className="font-bold text-foreground">{t("auth.demoNumbers")}</p>
            {[
              ["admin", "09120000000"],
              ["teacher", "09120000001"],
              ["parent", "09120000088"],
            ].map(([role, number]) => (
              <button
                key={role}
                type="button"
                onClick={() => setMobile(number)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-start hover:bg-muted"
              >
                <strong>{t(`roles.${role}.title`)}</strong>
                <span dir="ltr">{number}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 text-center text-sm">
            <Link to="/register-school" className="font-bold text-primary">{t("auth.registerSchool")}</Link>
          </div>

          <div className="mt-3 text-center text-sm">
            <Link to="/" className="font-bold text-primary">{t("common.back_to_home")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
