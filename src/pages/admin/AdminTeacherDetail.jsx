import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  School,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import PanelHeader from "../../components/panel/PanelHeader";
import useAdminSchoolData from "../../hooks/useAdminSchoolData";
import { buildTeacherAdminStats } from "../../utils/adminTeacherStats";

const fmt = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("fa-IR", { maximumFractionDigits: 1 })
    : "—";

const formatAverage = (value) => (value == null ? "—" : `${fmt(value)} / 20`);

export default function AdminTeacherDetail() {
  const { teacherId } = useParams();
  const data = useAdminSchoolData();

  const teacher = useMemo(
    () => (data.teachers || []).find((item) => item.id === teacherId),
    [data.teachers, teacherId],
  );

  const stats = useMemo(
    () =>
      buildTeacherAdminStats({
        teacher,
        classes: data.classes || [],
        courses: data.courses || [],
        attendance: data.attendance || [],
        grades: data.grades || [],
        students: data.students || [],
        enrollments: data.enrollments || [],
      }),
    [teacher, data.classes, data.courses, data.attendance, data.grades, data.students, data.enrollments],
  );

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PanelHeader icon={School} panelName="پنل مدیر" />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold"
          >
            <ArrowLeft size={16} />
            بازگشت به پنل مدیر
          </Link>
          <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            این معلم پیدا نشد.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PanelHeader icon={School} panelName="پنل مدیر" />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={16} />
          بازگشت به مدیر
        </Link>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                اطلاعات معلم
              </p>
              <h1 className="mt-2 text-3xl font-black">{teacher.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {teacher.subject || "درس نامشخص"} •{" "}
                {teacher.mobile || "بدون شماره"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              <p className="font-bold text-foreground">
                {teacher.active ? "فعال" : "غیرفعال"}
              </p>
              <p>وضعیت حساب</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={Users}
              label="تعداد کلاس‌ها"
              value={stats.totalClasses}
              note="کلاس‌های مرتبط"
            />
            <MetricCard
              icon={GraduationCap}
              label="تعداد دانش‌آموزان"
              value={stats.classSummaries.reduce((sum, item) => sum + item.studentCount, 0)}
              note="دانش‌آموزان کلاس‌های مرتبط"
            />
            <MetricCard
              icon={BookOpen}
              label="تعداد دروس"
              value={stats.totalLessons}
              note="درس‌های ثبت‌شده"
            />
            <MetricCard
              icon={UserCheck}
              label="حاضر"
              value={stats.present}
              note="رکورد حضور"
            />
            <MetricCard
              icon={CalendarCheck}
              label="غایب"
              value={stats.absent}
              note="رکورد غیبت"
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="text-primary" size={22} />
            <h2 className="text-2xl font-black">گزارش کلاس‌ها</h2>
          </div>

          <div className="space-y-5">
            {stats.classSummaries.map((item) => (
              <div
                key={item.classId}
                className="rounded-3xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">کلاس</p>
                    <h3 className="text-xl font-black">{item.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
                    <TrendingUp size={16} />
                    میانگین کلاس: {formatAverage(item.average)}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="حاضر" value={item.present} />
                  <MiniStat label="غایب" value={item.absent} />
                  <MiniStat label="تاخیری" value={item.late} />
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-sm font-bold text-muted-foreground">
                    آمار هر درس در این کلاس
                  </p>
                  <div className="space-y-3">
                    {item.lessons.map((lesson) => (
                      <div
                        key={lesson.courseId}
                        className="rounded-2xl border border-border bg-muted p-3"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="break-words font-bold">
                              {lesson.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              معدل درس: {formatAverage(lesson.average)} · کل دانش‌آموزان: {lesson.studentCount}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs font-bold">
                            <Badge label="حاضر" value={lesson.present} />
                            <Badge label="غایب" value={lesson.absent} />
                            <Badge label="تاخیری" value={lesson.late} />
                            <Badge label="کل دانش‌آموزان" value={lesson.studentCount} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-3xl border border-border bg-muted p-5 shadow-sm">
      <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
        <Icon size={22} aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MiniStat({ label, value, compact = false }) {
  return (
    <div className="rounded-2xl border border-border bg-muted px-3 py-2 text-center">
      <p className={`font-bold ${compact ? "text-sm" : "text-base"}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Badge({ label, value }) {
  return (
    <span className="rounded-full border border-border bg-card px-2 py-1 text-xs font-bold">
      {label}: {value}
    </span>
  );
}
