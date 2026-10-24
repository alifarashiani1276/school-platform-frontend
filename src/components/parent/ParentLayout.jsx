import {
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useParentData from "../../hooks/useParentData";
import { duplicateNames } from "../../services/parentService";
import PanelHeader from "../panel/PanelHeader";

const NAV = [
  { to: "/parent", end: true, icon: LayoutDashboard, key: "overview" },
  { to: "/parent/schedule", icon: CalendarRange, key: "schedule" },
  { to: "/parent/attendance", icon: CalendarCheck, key: "attendance" },
  { to: "/parent/grades", icon: Star, key: "grades" },
  { to: "/parent/assignments", icon: ClipboardList, key: "assignments" },
  { to: "/parent/messages", icon: MessageSquare, key: "messages" },
];

const FAMILY_NAV = { to: "/parent/family", icon: Users, key: "family" };

// The chosen child survives a page reload (this tab only, per parent mobile).
const selectionKey = (mobile) => `school:parentChild:${mobile}`;
const readSelection = (mobile) => {
  try {
    return mobile ? sessionStorage.getItem(selectionKey(mobile)) : null;
  } catch {
    return null;
  }
};
const writeSelection = (mobile, key) => {
  try {
    if (mobile) sessionStorage.setItem(selectionKey(mobile), key);
  } catch {
    // storage unavailable: the selection simply is not remembered
  }
};

// Shell of every parent page: header, navigation and the child switcher.
// Pages read the selected child from the outlet context.
export default function ParentLayout() {
  const { t } = useTranslation();
  const data = useParentData();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [selectedKey, setSelectedKey] = useState(null);
  const redirected = useRef(false);

  const kids = data.children;
  const storedKey = readSelection(data.mobile);
  const child =
    kids.find((c) => c.key === selectedKey) ??
    kids.find((c) => c.key === storedKey) ??
    kids[0] ??
    null;
  const hasMany = kids.length > 1;
  const hasStored = kids.some((c) => c.key === storedKey);
  const nav = hasMany ? [FAMILY_NAV, ...NAV] : NAV;
  const sharedNames = duplicateNames(kids);

  const selectChild = (key) => {
    setSelectedKey(key);
    writeSelection(data.mobile, key);
  };

  // A parent with several children first lands on the family overview, once,
  // as long as no child has been chosen yet.
  useEffect(() => {
    if (data.loading || kids.length === 0 || redirected.current) return;
    redirected.current = true;
    if (hasMany && pathname === "/parent" && !hasStored) {
      navigate("/parent/family", { replace: true });
    }
  }, [data.loading, kids.length, hasMany, pathname, hasStored, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PanelHeader icon={UserRound} panelName={t("parent.panelName")} />

      <div className="mx-auto max-w-6xl px-4 py-6">
        {data.loading ? (
          <p className="rounded-3xl border border-border bg-card p-6 text-muted-foreground">
            {t("common.loading")}
          </p>
        ) : !child ? (
          <p className="rounded-3xl border border-border bg-card p-6 text-muted-foreground">
            {t("parent.noChildren")}
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <nav
              aria-label={t("parent.nav.label")}
              className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:flex-col lg:self-start lg:overflow-visible lg:pb-0"
            >
              {nav.map(({ to, end, icon: Icon, key }) => (
                <NavLink
                  key={key}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card hover:bg-muted"
                    }`
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  {t(`parent.nav.${key}`)}
                </NavLink>
              ))}
            </nav>

            <main className="min-w-0">
              {hasMany && pathname !== "/parent/family" && (
                <div
                  className="mb-6 flex flex-wrap items-center gap-2"
                  role="tablist"
                  aria-label={t("parent.yourChildren")}
                >
                  <GraduationCap size={20} className="text-primary" aria-hidden="true" />
                  {kids.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      role="tab"
                      aria-selected={c.key === child.key}
                      onClick={() => selectChild(c.key)}
                      dir="auto"
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                        c.key === child.key
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card hover:bg-muted"
                      }`}
                    >
                      {c.name}
                      {sharedNames.has(c.name) && (
                        <span className="ms-1 text-xs font-normal opacity-80">
                          ({t(`parent.source.${c.source}`)})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <Outlet
                context={{
                  child,
                  kids,
                  selectChild,
                  mobile: data.mobile,
                  messages: data.messages,
                }}
              />
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
