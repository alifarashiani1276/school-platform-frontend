import { FileSpreadsheet, FileDown, UserPlus, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  downloadStudentTemplate,
  planStudents,
  readStudentsFromExcel,
  saveStudents,
} from "../../services/adminStudentService";
import { readStorage } from "../../services/storage";

const ROW_ERRORS = {
  noName: "نام دانش‌آموز خالی است",
  noClass: "کلاس خالی است",
  badMobile: "موبایل والد معتبر نیست",
  staffMobile: "این شماره متعلق به یک معلم یا مدیر است",
  duplicate: "تکراری (قبلاً ثبت شده)",
};

const FILE_ERRORS = {
  badFileType: "فقط فایل اکسل با پسوند xlsx پذیرفته می‌شود.",
  fileTooBig: "حجم فایل بیشتر از ۵ مگابایت است.",
  unreadableFile: "فایل خوانده نشد. مطمئن شوید فایل xlsx سالم است.",
  emptyFile: "فایل خالی است.",
  missingColumns:
    "ستون‌های لازم پیدا نشد. ردیف اول باید شامل «نام دانش‌آموز»، «کلاس» و «موبایل والد» باشد.",
  tooManyRows: "حداکثر ۲٬۰۰۰ دانش‌آموز در هر فایل مجاز است.",
  nothingToSave: "هیچ ردیف معتبری برای ثبت وجود ندارد.",
  forbidden: "برای این کار باید به‌عنوان مدیر مدرسه وارد شده باشید.",
};

const fieldClass =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const EMPTY_FORM = { name: "", className: "", parentMobile: "" };

// Manager tools for the students tab: define one student, or upload an Excel
// sheet, review it in a table, and only then save it.
export default function StudentTools({ classes, fmt, onToast }) {
  const fileRef = useRef(null);
  const [mode, setMode] = useState(null); // "form" | "excel" | null
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [excel, setExcel] = useState(null); // { fileName, rows, okCount, newClasses }
  const [excelError, setExcelError] = useState("");
  const [busy, setBusy] = useState(false);

  const currentPlan = (candidates) => {
    const session = readStorage("session", null);
    return planStudents(candidates, {
      schoolId: session?.schoolId,
      data: readStorage("appData", {}) || {},
    });
  };

  const submitForm = (event) => {
    event.preventDefault();
    setFormError("");
    const plan = currentPlan([form]);
    const row = plan.rows[0];
    if (row.status !== "ok") {
      setFormError(ROW_ERRORS[row.error] || "اطلاعات واردشده معتبر نیست.");
      return;
    }
    try {
      const result = saveStudents([form]);
      setForm(EMPTY_FORM);
      onToast(
        result.newClasses
          ? "دانش‌آموز ثبت شد و کلاس جدید ساخته شد"
          : "دانش‌آموز با موفقیت ثبت شد",
      );
    } catch (error) {
      setFormError(FILE_ERRORS[error.code] || "ثبت انجام نشد.");
    }
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    setExcelError("");
    setExcel(null);
    setBusy(true);
    try {
      const candidates = await readStudentsFromExcel(file);
      const plan = currentPlan(candidates);
      setExcel({ fileName: file.name, ...plan });
    } catch (error) {
      setExcelError(FILE_ERRORS[error.code] || "خواندن فایل انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = () => {
    try {
      // Plan again from the candidates so the save uses the latest data.
      const result = saveStudents(excel.rows.map(({ line, name, className, parentMobile }) => ({
        line,
        name,
        className,
        parentMobile,
      })));
      setExcel(null);
      setMode(null);
      onToast(
        `${fmt(result.saved)} دانش‌آموز ثبت شد` +
          (result.skipped ? ` · ${fmt(result.skipped)} ردیف رد شد` : ""),
      );
    } catch (error) {
      setExcelError(FILE_ERRORS[error.code] || "ثبت انجام نشد.");
    }
  };

  const closePanel = () => {
    setMode(null);
    setExcel(null);
    setExcelError("");
    setFormError("");
  };

  const toggle = (next) => () => (mode === next ? closePanel() : (closePanel(), setMode(next)));
  const skippedCount = excel ? excel.rows.length - excel.okCount : 0;

  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggle("form")}
          aria-expanded={mode === "form"}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <UserPlus size={16} /> تعریف دانش‌آموز
        </button>
        <button
          type="button"
          onClick={toggle("excel")}
          aria-expanded={mode === "excel"}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted"
        >
          <FileSpreadsheet size={16} /> آپلود فایل اکسل
        </button>
      </div>

      {mode === "form" && (
        <form
          onSubmit={submitForm}
          className="mt-4 grid gap-3 rounded-2xl border border-border bg-muted p-4 sm:grid-cols-3"
        >
          <div>
            <label htmlFor="st-name" className="mb-1 block text-xs font-bold">
              نام و نام خانوادگی دانش‌آموز
            </label>
            <input
              id="st-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`${fieldClass} w-full`}
            />
          </div>
          <div>
            <label htmlFor="st-class" className="mb-1 block text-xs font-bold">
              کلاس
            </label>
            <input
              id="st-class"
              required
              list="st-class-list"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
              placeholder="انتخاب یا نوشتن نام کلاس"
              className={`${fieldClass} w-full`}
            />
            <datalist id="st-class-list">
              {classes.map((cls) => (
                <option key={cls.id} value={cls.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="st-mobile" className="mb-1 block text-xs font-bold">
              موبایل والد
            </label>
            <input
              id="st-mobile"
              required
              dir="ltr"
              inputMode="tel"
              value={form.parentMobile}
              onChange={(e) => setForm({ ...form, parentMobile: e.target.value })}
              placeholder="09xxxxxxxxx"
              className={`${fieldClass} w-full`}
            />
          </div>
          {formError && (
            <p role="alert" className="text-sm font-bold text-destructive sm:col-span-3">
              {formError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              ثبت دانش‌آموز
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
            >
              انصراف
            </button>
            <p className="text-xs text-muted-foreground">
              اگر کلاس وجود نداشته باشد، با همین نام ساخته می‌شود. والد با همین شماره وارد پنل والدین می‌شود.
            </p>
          </div>
        </form>
      )}

      {mode === "excel" && (
        <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={onFile}
              className="sr-only"
              id="st-file"
            />
            <label
              htmlFor="st-file"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              <FileSpreadsheet size={16} /> {busy ? "در حال خواندن..." : "انتخاب فایل xlsx"}
            </label>
            <button
              type="button"
              onClick={() => downloadStudentTemplate()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold hover:bg-background"
            >
              <FileDown size={16} /> دانلود فایل نمونه
            </button>
            <button
              type="button"
              onClick={closePanel}
              aria-label="بستن"
              className="ms-auto rounded-full p-2 hover:bg-background"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ردیف اول فایل باید عنوان ستون‌ها باشد: «نام دانش‌آموز»، «کلاس» و «موبایل والد». بعد از انتخاب فایل، اطلاعات در جدول نمایش داده می‌شود و فقط با تأیید شما ثبت می‌شود.
          </p>

          {excelError && (
            <p role="alert" className="mt-3 text-sm font-bold text-destructive">
              {excelError}
            </p>
          )}

          {excel && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold" dir="auto">{excel.fileName}</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">
                  {fmt(excel.okCount)} ردیف قابل ثبت
                </span>
                {skippedCount > 0 && (
                  <span className="rounded-full bg-destructive/10 px-3 py-1 font-bold text-destructive">
                    {fmt(skippedCount)} ردیف دارای مشکل (ثبت نمی‌شود)
                  </span>
                )}
                {excel.newClasses.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    {fmt(excel.newClasses.length)} کلاس جدید ساخته می‌شود
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[560px] text-right text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="p-3">ردیف</th>
                      <th className="p-3">نام دانش‌آموز</th>
                      <th className="p-3">کلاس</th>
                      <th className="p-3">موبایل والد</th>
                      <th className="p-3">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excel.rows.map((row) => (
                      <tr
                        key={row.line}
                        className={`border-b border-border last:border-0 ${row.status === "ok" ? "" : "bg-destructive/5"}`}
                      >
                        <td className="p-3 text-muted-foreground">{fmt(row.line)}</td>
                        <td className="p-3 font-bold">{row.name || "—"}</td>
                        <td className="p-3">
                          {row.className || "—"}
                          {row.status === "ok" && row.newClass && (
                            <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                              جدید
                            </span>
                          )}
                        </td>
                        <td className="p-3" dir="ltr">{row.parentMobile || "—"}</td>
                        <td className="p-3">
                          {row.status === "ok" ? (
                            <span className="font-bold text-primary">آماده ثبت</span>
                          ) : (
                            <span className="font-bold text-destructive">
                              {ROW_ERRORS[row.error]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!excel.okCount}
                  onClick={confirmImport}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ثبت {fmt(excel.okCount)} دانش‌آموز
                </button>
                <button
                  type="button"
                  onClick={() => setExcel(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
                >
                  لغو
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
