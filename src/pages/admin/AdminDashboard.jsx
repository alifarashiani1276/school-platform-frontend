import {
  Activity,
  BookOpen,
  KeyRound,
  Download,
  GraduationCap,
  Search,
  School,
  Users,
  UserCheck,
  ClipboardCheck,
  TrendingUp,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ChangePasswordDialog from "../../components/admin/ChangePasswordDialog";
import StudentManageDialog from "../../components/admin/StudentManageDialog";
import StudentTools from "../../components/admin/StudentTools";
import PanelHeader from "../../components/panel/PanelHeader";
import useAdminSchoolData from "../../hooks/useAdminSchoolData";
import { isSuperAdminMobile } from "../../services/schoolRegistry";
import { readStorage, writeStorage } from "../../services/storage";
import { normalizePhone } from "../../utils/jalali";

const fmtDate = (value, language) =>
  value
    ? new Date(value).toLocaleDateString(language === "fa" ? "fa-IR" : language)
    : "—";

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const data = useAdminSchoolData();
  const [section, setSection] = useState("overview");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [toast, setToast] = useState("");
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [manageId, setManageId] = useState(null);
  const sessionUserId = readStorage("session", null)?.userId;
  const me = (data.admins || []).find((admin) => admin.id === sessionUserId);
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    mobile: "",
    subject: "",
  });
  const teachers = data.teachers || [];
  const students = data.students || [];
  const classes = data.classes || [];
  const courses = data.courses || [];
  const grades = data.grades || [];
  const attendance = data.attendance || [];
  const fmt = (n) => Number(n || 0).toLocaleString(i18n.language);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const cls = classes.find((item) => item.id === student.classId);
        return (
          (!classFilter || student.classId === classFilter) &&
          `${student.name || ""} ${cls?.name || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );
      }),
    [students, classes, classFilter, query],
  );

  const filteredTeachers = teachers.filter((teacher) =>
    `${teacher.name || ""} ${teacher.subject || ""} ${teacher.mobile || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const average = grades.length
    ? (grades.reduce(
        (sum, grade) =>
          sum + Number(grade.score || 0) / Math.max(1, Number(grade.max || 20)),
        0,
      ) /
        grades.length) *
      20
    : null;
  const attendanceRate = attendance.length
    ? Math.round(
        (attendance.filter(
          (item) => item.status === "present" || item.status === "late",
        ).length /
          attendance.length) *
          100,
      )
    : null;
  const activeTeachers = teachers.filter((teacher) => teacher.active).length;
  // Use the browser's local calendar date so today's absences match the teacher panel.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayAbsentStudents = students
    .filter((student) =>
      attendance.some(
        (record) =>
          record.studentId === student.id &&
          record.date === today &&
          record.status === "absent",
      ),
    )
    .map((student) => ({
      ...student,
      className:
        classes.find((cls) => cls.id === student.classId)?.name ||
        "کلاس نامشخص",
      absenceDays: new Set(
        attendance
          .filter(
            (record) =>
              record.studentId === student.id && record.status === "absent",
          )
          .map((record) => record.date || record.id),
      ).size,
    }));

  const exportCsv = (name, rows) => {
    if (!rows.length) {
      setToast("داده‌ای برای خروجی وجود ندارد");
      return;
    }
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv =
      "\uFEFF" +
      [headers, ...rows.map((row) => headers.map((key) => row[key] ?? ""))]
        .map((row) => row.map(escape).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    setToast("خروجی آماده شد");
  };

  const toggleTeacher = (teacher) => {
    const current = readStorage("appData", {}) || {};
    const mySchoolId = readStorage("session", null)?.schoolId;
    // A manager can only switch teachers of their own school.
    if (!mySchoolId || teacher.schoolId !== mySchoolId) return;
    const nextTeachers = (current.teachers || []).map((item) =>
      item.id === teacher.id && item.schoolId === mySchoolId
        ? { ...item, active: !item.active }
        : item,
    );
    writeStorage("appData", { ...current, teachers: nextTeachers });
    setToast(teacher.active ? "حساب معلم غیرفعال شد" : "حساب معلم فعال شد");
  };

  const addTeacher = (event) => {
    event.preventDefault();
    const name = teacherForm.name.trim();
    const mobile = teacherForm.mobile.trim();
    if (!name || !/^09\d{9}$/.test(mobile)) {
      setToast("نام و شماره موبایل معتبر (۱۱ رقم) را وارد کنید");
      return;
    }
    const current = readStorage("appData", {}) || {};
    const session = readStorage("session", null);
    if (!session?.schoolId) return;
    // A mobile number identifies one account across ALL schools.
    const usedElsewhere =
      isSuperAdminMobile(mobile) ||
      [...(current.teachers || []), ...(current.admins || [])].some(
        (item) => normalizePhone(item.mobile) === normalizePhone(mobile),
      );
    if (usedElsewhere) {
      setToast("این شماره موبایل قبلاً ثبت شده است");
      return;
    }
    const created = {
      id: `teacher-${Date.now()}`,
      name,
      mobile,
      subject: teacherForm.subject.trim(),
      active: true,
      createdByAdminId: session?.userId || "admin",
      schoolId: session.schoolId,
      createdAt: new Date().toISOString(),
    };
    writeStorage("appData", {
      ...current,
      teachers: [...(current.teachers || []), created],
    });
    setTeacherForm({ name: "", mobile: "", subject: "" });
    setShowAddTeacher(false);
    setToast("معلم با موفقیت تعریف شد");
  };

  const sections = [
    ["overview", "نمای کلی", Activity],
    ["students", "دانش‌آموزان", GraduationCap],
    ["teachers", "معلمان", Users],
    ["courses", "دروس و کلاس‌ها", BookOpen],
    ["reports", "گزارش‌ها", ClipboardCheck],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PanelHeader icon={School} panelName={t("admin.panelName")} />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
              {t("admin.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-black">{t("admin.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              نظارت بر وضعیت آموزشی و اطلاعات ثبت‌شده مدرسه
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPassword(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-muted"
          >
            <KeyRound size={17} /> تغییر رمز عبور
          </button>
          <button
            onClick={() =>
              exportCsv("school-overview.csv", [
                { شاخص: "معلمان", مقدار: teachers.length },
                { شاخص: "دانش‌آموزان", مقدار: students.length },
                { شاخص: "کلاس‌ها", مقدار: classes.length },
                { شاخص: "دروس", مقدار: courses.length },
                { شاخص: "سوابق نمره", مقدار: grades.length },
                { شاخص: "سوابق حضور و غیاب", مقدار: attendance.length },
              ])
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-muted"
          >
            <Download size={17} /> دریافت گزارش خلاصه
          </button>
          </div>
        </div>

        {me?.mustChangePassword && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-100 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-500/15 dark:text-amber-200"
          >
            <span>
              رمز عبور شما توسط مدیر سامانه بازنشانی شده است. لطفاً یک رمز عبور جدید انتخاب کنید.
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(true)}
              className="rounded-xl bg-amber-600 px-4 py-2 font-bold text-white"
            >
              تغییر رمز عبور
            </button>
          </div>
        )}

        <nav
          className="mb-6 flex gap-2 overflow-x-auto pb-1"
          aria-label="بخش‌های مدیریتی"
        >
          {sections.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                setQuery("");
              }}
              aria-current={section === id ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${section === id ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted"}`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        {section === "overview" && (
          <>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Users}
                label={t("admin.teachers")}
                value={fmt(teachers.length)}
                note={`${fmt(activeTeachers)} فعال`}
                tone="bg-primary/10 text-primary"
              />
              <StatCard
                icon={GraduationCap}
                label={t("admin.students")}
                value={fmt(students.length)}
                note={`${fmt(classes.length)} کلاس ثبت‌شده`}
                tone="bg-secondary/20 text-foreground"
              />
              <StatCard
                icon={BookOpen}
                label="دروس ثبت‌شده"
                value={fmt(courses.length)}
                note={`${fmt(grades.length)} رکورد نمره`}
                tone="bg-accent/30 text-accent-foreground"
              />
              <StatCard
                icon={UserCheck}
                label="حضور ثبت‌شده"
                value={
                  attendanceRate === null ? "—" : `${fmt(attendanceRate)}٪`
                }
                note={
                  attendance.length
                    ? `${fmt(attendance.length)} رکورد حضور و غیاب`
                    : "هنوز رکوردی ثبت نشده"
                }
                tone="bg-muted text-foreground"
              />
            </div>

            <section className="mt-7 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">دانش‌آموزان غایب امروز</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    فهرست بر اساس حضور و غیاب ثبت‌شده توسط معلمان
                  </p>
                </div>
                <span className="w-fit rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-bold text-destructive">
                  {fmt(todayAbsentStudents.length)} غایب ·{" "}
                  {fmtDate(today, i18n.language)}
                </span>
              </div>
              {todayAbsentStudents.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-right text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="p-3">نام دانش‌آموز</th>
                        <th className="p-3">کلاس</th>
                        <th className="p-3">تعداد کل روزهای غیبت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAbsentStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="p-3 font-bold">
                            {student.name || "—"}
                          </td>
                          <td className="p-3">{student.className}</td>
                          <td className="p-3">
                            <span className="rounded-full bg-destructive/10 px-3 py-1 font-black text-destructive">
                              {fmt(student.absenceDays)} روز
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty text="برای امروز غیبتی ثبت نشده است." />
              )}
            </section>

            <div className="mt-7 grid gap-6 lg:grid-cols-1">
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
                  <ShieldCheck size={21} />
                  وضعیت مدرسه
                </h2>
                <div className="space-y-3">
                  <InfoRow
                    label={t("admin.schoolName")}
                    value={data.school?.name || "—"}
                  />
                  <InfoRow
                    label={t("admin.activeTeachers")}
                    value={fmt(activeTeachers)}
                  />
                  <InfoRow
                    label={t("admin.registeredStudents")}
                    value={fmt(students.length)}
                  />

                  <InfoRow
                    label={t("admin.systemStatus")}
                    value={t("admin.systemActive")}
                  />
                </div>
              </section>
            </div>
          </>
        )}

        {section === "students" && (
          <section className="mt-7 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <h2 className="text-xl font-black">فهرست دانش‌آموزان</h2>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search
                    className="absolute right-3 top-3 text-muted-foreground"
                    size={17}
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="جستجوی نام دانش‌آموز..."
                    className="w-full rounded-xl border border-border bg-background py-2.5 pe-3 ps-9 text-sm"
                  />
                </div>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">همه کلاس‌ها</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    exportCsv(
                      "students.csv",
                      filteredStudents.map((student) => ({
                        نام: student.name,
                        کلاس:
                          classes.find((cls) => cls.id === student.classId)
                            ?.name || "",
                        "موبایل والد": student.parentMobile || "",
                        شناسه: student.id,
                      })),
                    )
                  }
                  className="rounded-xl border border-border px-3 py-2 text-sm font-bold"
                >
                  <Download className="ml-2 inline" size={15} />
                  CSV
                </button>
              </div>
            </div>
            <StudentTools classes={classes} fmt={fmt} onToast={setToast} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-right text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-3">نام دانش‌آموز</th>
                    <th className="p-3">کلاس</th>
                    <th className="p-3">موبایل والد</th>
                    <th className="p-3">شناسه</th>
                    <th className="p-3">معدل از ۲۰</th>
                    <th className="p-3">تعداد روزهای غیبت</th>
                    <th className="p-3">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="p-3 font-bold">{student.name}</td>
                      <td className="p-3">
                        {classes.find((cls) => cls.id === student.classId)
                          ?.name || "—"}
                      </td>
                      <td className="p-3" dir="ltr">
                        {student.parentMobile || "—"}
                      </td>
                      <td className="p-3" dir="ltr">
                        {student.id}
                      </td>
                      <td className="p-3">
                        {(() => {
                          const records = grades.filter(
                            (grade) => grade.studentId === student.id,
                          );
                          const totalMax = records.reduce(
                            (sum, grade) => sum + Number(grade.max || 20),
                            0,
                          );
                          return totalMax
                            ? `${fmt(((records.reduce((sum, grade) => sum + Number(grade.score || 0), 0) / totalMax) * 20).toFixed(1))} / ۲۰`
                            : "ثبت نشده";
                        })()}
                      </td>
                      <td className="p-3">
                        {(() => {
                          const absences = attendance.filter(
                            (item) =>
                              item.studentId === student.id &&
                              item.status === "absent",
                          );
                          const days = new Set(
                            absences.map(
                              (item) => item.date || item.createdAt || item.id,
                            ),
                          );
                          return fmt(days.size);
                        })()}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setManageId(student.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                        >
                          مدیریت / حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredStudents.length && (
              <Empty text="دانش‌آموزی مطابق جستجو پیدا نشد." />
            )}
          </section>
        )}

        {section === "teachers" && (
          <section className="mt-7 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-black">مدیریت معلمان</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAddTeacher((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                >
                  <UserPlus size={16} /> افزودن معلم
                </button>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی معلم یا درس..."
                  className="min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() =>
                    exportCsv(
                      "teachers.csv",
                      filteredTeachers.map(
                        ({ name, subject, mobile, active }) => ({
                          نام: name,
                          درس: subject,
                          موبایل: mobile,
                          وضعیت: active ? "فعال" : "غیرفعال",
                        }),
                      ),
                    )
                  }
                  className="rounded-xl border border-border px-3 py-2 text-sm font-bold"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
            {showAddTeacher && (
              <form
                onSubmit={addTeacher}
                className="mb-5 grid gap-3 rounded-2xl border border-border bg-muted p-4 sm:grid-cols-3"
              >
                <input
                  required
                  value={teacherForm.name}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, name: e.target.value })
                  }
                  placeholder="نام و نام خانوادگی"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  required
                  inputMode="numeric"
                  pattern="09[0-9]{9}"
                  value={teacherForm.mobile}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, mobile: e.target.value })
                  }
                  placeholder="شماره موبایل 09xxxxxxxxx"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={teacherForm.subject}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, subject: e.target.value })
                  }
                  placeholder="درس (اختیاری)"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex gap-2 sm:col-span-3">
                  <button className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                    ثبت معلم
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTeacher(false)}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
                  >
                    انصراف
                  </button>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-3">
                  در نسخه فرانت‌اند، ورود معلم با کد آزمایشی ۱۲۳۴۵۶ فعال می‌شود؛
                  پس از اتصال بک‌اند، ایجاد حساب باید از API انجام شود.
                </p>
              </form>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {filteredTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4"
                >
                  <Link
                    to={`/admin/teacher/${teacher.id}`}
                    className="min-w-0 flex-1 hover:text-primary"
                  >
                    <p className="break-words font-bold">{teacher.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.subject || "بدون درس مشخص"} ·{" "}
                      {teacher.mobile || "بدون شماره"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      کلاس/درس مرتبط:{" "}
                      {fmt(
                        courses.filter(
                          (course) => course.teacherId === teacher.id,
                        ).length,
                      )}
                    </p>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${teacher.active ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"}`}
                    >
                      {teacher.active ? "فعال" : "غیرفعال"}
                    </span>
                    <button
                      onClick={() => toggleTeacher(teacher)}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-background"
                    >
                      {teacher.active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!filteredTeachers.length && <Empty text="معلمی پیدا نشد." />}
          </section>
        )}

        {section === "courses" && (
          <section className="mt-7 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <h2 className="mb-4 text-xl font-black">دروس و کلاس‌ها</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="rounded-2xl border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{cls.name}</p>
                    <span className="text-sm text-muted-foreground">
                      پایه {cls.level || "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {fmt(
                      students.filter((student) => student.classId === cls.id)
                        .length,
                    )}{" "}
                    دانش‌آموز
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {courses
                      .filter((course) => course.classId === cls.id)
                      .map((course) => (
                        <span
                          key={course.id}
                          className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                        >
                          {course.name}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            {!classes.length && <Empty text="کلاسی ثبت نشده است." />}
          </section>
        )}

        {section === "reports" && (
          <section className="mt-7 rounded-3xl border border-border bg-card p-5 sm:p-6">
            <h2 className="mb-2 text-xl font-black">گزارش عملکرد آموزشی</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              گزارش‌ها بر اساس رکوردهای واقعی ذخیره‌شده در پروژه ساخته می‌شوند.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReportCard
                title="فهرست دانش‌آموزان"
                detail={`${fmt(students.length)} دانش‌آموز`}
                onClick={() =>
                  exportCsv(
                    "students.csv",
                    students.map((student) => ({
                      نام: student.name,
                      کلاس:
                        classes.find((cls) => cls.id === student.classId)
                          ?.name || "",
                      شناسه: student.id,
                    })),
                  )
                }
              />
              <ReportCard
                title="فهرست معلمان"
                detail={`${fmt(teachers.length)} معلم · ${fmt(activeTeachers)} فعال`}
                onClick={() =>
                  exportCsv(
                    "teachers.csv",
                    teachers.map((teacher) => ({
                      نام: teacher.name,
                      درس: teacher.subject,
                      وضعیت: teacher.active ? "فعال" : "غیرفعال",
                    })),
                  )
                }
              />
              <ReportCard
                title="دروس و کلاس‌ها"
                detail={`${fmt(courses.length)} درس در ${fmt(classes.length)} کلاس`}
                onClick={() =>
                  exportCsv(
                    "courses.csv",
                    courses.map((course) => ({
                      درس: course.name,
                      کلاس:
                        classes.find((cls) => cls.id === course.classId)
                          ?.name || "",
                      معلم:
                        teachers.find(
                          (teacher) => teacher.id === course.teacherId,
                        )?.name || "",
                    })),
                  )
                }
              />
            </div>
          </section>
        )}
      </main>
      <StudentManageDialog
        student={students.find((item) => item.id === manageId)}
        data={data}
        onClose={() => setManageId(null)}
        onToast={setToast}
      />
      <ChangePasswordDialog
        open={showPassword}
        onClose={() => setShowPassword(false)}
        onDone={() => setToast("رمز عبور با موفقیت تغییر کرد")}
      />
      {toast && (
        <div
          role="status"
          className="fixed bottom-4 z-50 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background shadow-xl"
          style={{ insetInlineEnd: "1rem" }}
        >
          {toast}
          <button onClick={() => setToast("")} className="mr-4 underline">
            بستن
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-2xl p-3 ${tone}`}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-3 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="break-words text-end text-sm font-black" dir="auto">
        {value}
      </span>
    </div>
  );
}
function Empty({ text }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
function ReportCard({ title, detail, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4 text-right hover:bg-muted"
    >
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
      <Download size={18} />
    </button>
  );
}
