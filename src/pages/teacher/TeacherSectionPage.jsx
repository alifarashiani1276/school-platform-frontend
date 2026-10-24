import { Construction } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import TeacherEmptyState from "../../components/teacher/TeacherEmptyState";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";

// Sections linked from the sidebar / profile menu that have no dedicated screen yet.
const SECTIONS = {
  "join-school": { title: "teacher.nav.joinSchool", text: "teacher.pages.joinSchool.text" },
  store: { title: "teacher.nav.store", text: "teacher.pages.store.text" },
  resources: { title: "teacher.nav.resources", text: "teacher.pages.resources.text" },
  support: { title: "teacher.nav.support", text: "teacher.pages.support.text" },
  profile: { title: "teacher.topbar.profile", text: "teacher.topbar.helpText" },
  settings: { title: "teacher.topbar.settings", text: "teacher.topbar.helpText" },
};

export default function TeacherSectionPage() {
  const { t } = useTranslation();
  const { section } = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const config = SECTIONS[section];

  if (!config) return <Navigate to="/teacher" replace />;

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
        <main className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-black text-foreground">{t(config.title)}</h1>
          <TeacherEmptyState
            icon={Construction}
            title={t("teacher.pages.comingSoon")}
            description={t(config.text)}
          />
        </main>
      </div>
    </div>
  );
}
