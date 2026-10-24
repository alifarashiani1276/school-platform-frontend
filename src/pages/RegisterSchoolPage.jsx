import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicHeader from "../components/PublicHeader";
import { requestSchoolRegistration } from "../services/schoolRegistry";

const fieldClass =
  "w-full rounded-2xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

// Public form: a school manager asks to join. The request stays "pending" and
// nothing can be used until the platform owner approves it.
export default function RegisterSchoolPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    schoolName: "",
    city: "",
    managerName: "",
    mobile: "",
  });
  const [errorCode, setErrorCode] = useState("");
  const [done, setDone] = useState(false);

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorCode("");
    try {
      requestSchoolRegistration(form);
      setDone(true);
    } catch (error) {
      setErrorCode(error.code || "invalidInput");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/5">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-black">{t("register.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("register.text")}
            </p>
          </div>

          {done ? (
            <div className="space-y-5">
              <p
                role="status"
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm"
              >
                {t("register.success")}
              </p>
              <Link
                to="/login"
                className="block w-full rounded-2xl bg-primary px-4 py-3 text-center text-sm font-black text-primary-foreground"
              >
                {t("register.toLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reg-school" className="mb-1 block text-sm font-semibold">
                  {t("register.schoolName")}
                </label>
                <input
                  id="reg-school"
                  value={form.schoolName}
                  onChange={set("schoolName")}
                  dir="auto"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="reg-city" className="mb-1 block text-sm font-semibold">
                  {t("register.city")}
                </label>
                <input
                  id="reg-city"
                  value={form.city}
                  onChange={set("city")}
                  required
                  aria-required="true"
                  dir="auto"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="reg-manager" className="mb-1 block text-sm font-semibold">
                  {t("register.managerName")}
                </label>
                <input
                  id="reg-manager"
                  value={form.managerName}
                  onChange={set("managerName")}
                  dir="auto"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="reg-mobile" className="mb-1 block text-sm font-semibold">
                  {t("register.mobile")}
                </label>
                <input
                  id="reg-mobile"
                  value={form.mobile}
                  onChange={set("mobile")}
                  dir="ltr"
                  inputMode="tel"
                  placeholder="09xxxxxxxxx"
                  className={fieldClass}
                />
              </div>

              {errorCode ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
                >
                  {t(`registry.errors.${errorCode}`)}
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90"
              >
                {t("register.submit")}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="font-bold text-primary">
              {t("register.toLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
