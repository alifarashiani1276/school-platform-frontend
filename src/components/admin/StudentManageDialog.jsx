import { Trash2, UserMinus } from "lucide-react";
import Dialog from "../ui/Dialog";
import {
  deleteStudent,
  removeStudentFromClass,
  removeStudentFromCourse,
} from "../../services/adminStudentService";

const btn =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-background";

// Manager: take a student out of a class or a course (teacher's list), or
// delete the student from the school.
export default function StudentManageDialog({ student, data, onClose, onToast }) {
  if (!student) return null;
  const classes = data.classes || [];
  const courses = data.courses || [];
  const teachers = data.teachers || [];
  const cls = classes.find((c) => c.id === student.classId);
  const enrolled = (data.enrollments || [])
    .filter((e) => e.studentId === student.id)
    .map((e) => courses.find((c) => c.id === e.courseId))
    .filter(Boolean);

  const run = (action, message, confirmText) => () => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      action();
      onToast(message);
    } catch {
      onToast("انجام نشد. دوباره وارد شوید و تلاش کنید.");
    }
  };

  return (
    <Dialog open onClose={onClose} title={`مدیریت ${student.name}`} size="md">
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-black">کلاس</h3>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-3">
            <span className="font-bold" dir="auto">
              {cls?.name || "بدون کلاس"}
            </span>
            <button
              type="button"
              disabled={!cls}
              onClick={run(
                () => removeStudentFromClass(student.id),
                "دانش‌آموز از کلاس و درس‌های آن حذف شد",
                `«${student.name}» از کلاس «${cls?.name}» و همهٔ درس‌های آن کلاس حذف شود؟ دانش‌آموز در مدرسه می‌ماند.`,
              )}
              className={`${btn} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <UserMinus size={14} /> حذف از کلاس
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-black">درس‌ها (فهرست معلم‌ها)</h3>
          {enrolled.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">
              این دانش‌آموز در هیچ درسی ثبت نشده است.
            </p>
          ) : (
            <ul className="space-y-2">
              {enrolled.map((course) => (
                <li
                  key={course.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold" dir="auto">{course.name}</p>
                    <p className="text-xs text-muted-foreground" dir="auto">
                      معلم:{" "}
                      {teachers.find((t) => t.id === course.teacherId)?.name || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={run(
                      () => removeStudentFromCourse(student.id, course.id),
                      "دانش‌آموز از فهرست این درس حذف شد",
                      `«${student.name}» از درس «${course.name}» حذف شود؟`,
                    )}
                    className={btn}
                  >
                    <UserMinus size={14} /> حذف از درس
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
          <h3 className="mb-1 text-sm font-black text-destructive">حذف کامل</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            دانش‌آموز همراه با نمره‌ها، حضور و غیاب و ثبت‌نام درس‌هایش از مدرسه حذف می‌شود و قابل بازگشت نیست.
          </p>
          <button
            type="button"
            onClick={run(
              () => {
                deleteStudent(student.id);
                onClose();
              },
              "دانش‌آموز از مدرسه حذف شد",
              `«${student.name}» برای همیشه از مدرسه حذف شود؟`,
            )}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white"
          >
            <Trash2 size={15} /> حذف دانش‌آموز از مدرسه
          </button>
        </section>
      </div>
    </Dialog>
  );
}
