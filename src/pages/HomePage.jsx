import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicHeader from "../components/PublicHeader";

const ROLES = [
  {
    id: "admin",
    path: "/admin",
    tint: "bg-accent",
    image: "/images/role-admin.webp",
  },
  {
    id: "teacher",
    path: "/teacher",
    tint: "bg-secondary",
    image: "/images/role-teacher.webp",
  },
  {
    id: "parent",
    path: "/parent",
    tint: "bg-primary",
    image: "/images/role-parent.webp",
  },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 text-center">
        <h1 className="text-4xl font-black leading-tight sm:text-6xl">
          {t("hero.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          {t("hero.subtitle")}
        </p>

        <h2 className="mt-14 text-lg font-black">{t("roles.heading")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {ROLES.map(({ id, path, tint, image }) => (
            <Link
              key={id}
              to={path}
              className="flex flex-col items-center rounded-3xl border-2 border-border bg-card p-6 text-center transition hover:border-primary"
            >
              <div className="mb-6 w-full max-w-[160px] overflow-hidden rounded-2xl bg-muted">
                <img
                  src={image}
                  alt={t(`roles.${id}.title`)}
                  className="block aspect-[4/3] w-full object-contain object-center"
                />
              </div>
              <span className="block text-xl font-black">
                {t(`roles.${id}.title`)}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {t(`roles.${id}.text`)}
              </span>
              <span className="mt-4 block text-sm font-black text-primary">
                {t("roles.open")}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
