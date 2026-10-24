import { ArrowLeft, CalendarRange, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import { useTeacherClasses } from "../../data/teacherStore";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";

const WEEK_DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const DEFAULT_SLOTS = [
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "13:00-14:00",
  "14:00-15:00",
];
const MAX_LESSON_NAME_LENGTH = 40;

// A plan is saved as { slots: ["08:00-09:00", ...], days: { sat: { "08:00-09:00": "Math" } } }
// (the shape the parent panel already reads). While editing, every time slot is
// a row { id, from, to } so the teacher can change the hours freely.
const SLOT_PATTERN = /^(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})$/;
const pad = (value) => String(value).padStart(2, "0");

const parseSlot = (label) => {
  const match = SLOT_PATTERN.exec(String(label ?? "").trim());
  if (!match) return { from: "", to: "" };
  return {
    from: `${pad(match[1])}:${match[2]}`,
    to: `${pad(match[3])}:${match[4]}`,
  };
};

const slotLabel = (row) => `${row.from}-${row.to}`;

const emptyCells = (rows) =>
  Object.fromEntries(
    WEEK_DAYS.map((day) => [
      day,
      Object.fromEntries(rows.map((row) => [row.id, ""])),
    ]),
  );

const buildDraft = (plan, lessons = []) => {
  if (plan?.days && Array.isArray(plan.slots) && plan.slots.length > 0) {
    const rows = plan.slots.map((label, index) => ({
      id: `r${index}`,
      ...parseSlot(label),
    }));
    const cells = emptyCells(rows);
    WEEK_DAYS.forEach((day) => {
      rows.forEach((row, index) => {
        cells[day][row.id] = String(plan.days?.[day]?.[plan.slots[index]] ?? "");
      });
    });
    return { rows, cells };
  }

  const rows = DEFAULT_SLOTS.map((label, index) => ({
    id: `r${index}`,
    ...parseSlot(label),
  }));
  const cells = emptyCells(rows);
  const firstLesson = lessons[0]?.title ?? "";
  if (firstLesson) {
    WEEK_DAYS.forEach((day) => {
      rows.forEach((row, index) => {
        if (index % 2 === 0) cells[day][row.id] = firstLesson;
      });
    });
  }
  return { rows, cells };
};

// Returns an error key (under teacher.weeklyPlan.errors) or null.
const validateRows = (rows) => {
  if (rows.some((row) => !row.from || !row.to)) return "timeRequired";
  if (rows.some((row) => row.from >= row.to)) return "timeOrder";
  const labels = rows.map(slotLabel);
  if (new Set(labels).size !== labels.length) return "timeDuplicate";
  return null;
};

const rowProblem = (row, rows) => {
  if (!row.from || !row.to) return "timeRequired";
  if (row.from >= row.to) return "timeOrder";
  if (rows.some((other) => other.id !== row.id && slotLabel(other) === slotLabel(row))) {
    return "timeDuplicate";
  }
  return null;
};

export default function TeacherWeeklyPlanPage() {
  const { t } = useTranslation();
  const { classId } = useParams();
  const { activeClasses, getClass, updateClass } = useTeacherClasses();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(
    classId || activeClasses[0]?.id || "",
  );
  const [draft, setDraft] = useState({ rows: [], cells: {} });
  const [savedAt, setSavedAt] = useState("");
  const [errorKey, setErrorKey] = useState("");

  const selectedClass = getClass(selectedClassId) ?? activeClasses[0] ?? null;

  useEffect(() => {
    if (!selectedClass) return;
    setDraft(buildDraft(selectedClass.weeklyPlan, selectedClass.lessons ?? []));
    setErrorKey("");
  }, [selectedClass?.id, selectedClass?.weeklyPlan, selectedClass?.lessons]);

  useEffect(() => {
    setSavedAt("");
  }, [selectedClass?.id]);

  useEffect(() => {
    if (classId && classId !== selectedClassId) {
      setSelectedClassId(classId);
    }
  }, [classId, selectedClassId]);

  if (!selectedClass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-black text-foreground">
            {t("teacher.weeklyPlan.empty")}
          </h1>
          <Link to="/teacher" className="mt-4 inline-block">
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              {t("teacher.class.backToClasses")}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const updateCell = (day, rowId, value) => {
    const cleaned = value
      .replace(/\s+/g, " ")
      .slice(0, MAX_LESSON_NAME_LENGTH)
      .trimStart();
    setDraft((prev) => ({
      ...prev,
      cells: {
        ...prev.cells,
        [day]: { ...prev.cells[day], [rowId]: cleaned },
      },
    }));
  };

  const updateTime = (rowId, field, value) => {
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const addRow = () => {
    const id = `r${Date.now()}`;
    setDraft((prev) => {
      // Start the new slot where the last one ends, one hour long.
      const last = prev.rows[prev.rows.length - 1];
      let from = "";
      let to = "";
      if (last?.to) {
        const [h, m] = last.to.split(":").map(Number);
        if (h < 23) {
          from = last.to;
          to = `${pad(h + 1)}:${pad(m)}`;
        }
      }
      return {
        rows: [...prev.rows, { id, from, to }],
        cells: Object.fromEntries(
          WEEK_DAYS.map((day) => [day, { ...prev.cells[day], [id]: "" }]),
        ),
      };
    });
  };

  const removeRow = (rowId) => {
    setDraft((prev) => {
      if (prev.rows.length <= 1) return prev;
      return {
        rows: prev.rows.filter((row) => row.id !== rowId),
        cells: Object.fromEntries(
          WEEK_DAYS.map((day) => {
            const { [rowId]: _removed, ...rest } = prev.cells[day] ?? {};
            return [day, rest];
          }),
        ),
      };
    });
  };

  const handleSave = () => {
    const problem = validateRows(draft.rows);
    if (problem) {
      setErrorKey(problem);
      return;
    }
    setErrorKey("");

    const sorted = [...draft.rows].sort((a, b) =>
      slotLabel(a).localeCompare(slotLabel(b)),
    );
    const days = {};
    WEEK_DAYS.forEach((day) => {
      days[day] = Object.fromEntries(
        sorted.map((row) => [
          slotLabel(row),
          String(draft.cells?.[day]?.[row.id] ?? "")
            .trim()
            .slice(0, MAX_LESSON_NAME_LENGTH),
        ]),
      );
    });

    updateClass(selectedClass.id, {
      weeklyPlan: { slots: sorted.map(slotLabel), days },
    });
    setSavedAt(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    );
  };

  const timeInputClass = (invalid) =>
    `w-[7.5rem] rounded-xl border bg-background px-2 py-2 text-sm font-bold text-foreground outline-none focus:border-primary ${
      invalid ? "border-red-500" : "border-border"
    }`;

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <TeacherTopbar
          teacher={mockTeacher}
          onToggleMobileMenu={() => setMobileSidebarOpen((prev) => !prev)}
        />

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link
              to={classId ? `/teacher/class/${selectedClass.id}` : "/teacher"}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              <ArrowLeft size={16} className="rtl:-scale-x-100" />
              {classId
                ? t("teacher.class.backToClass")
                : t("teacher.class.backToClasses")}
            </Link>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-2xl">
                  <CalendarRange className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary" dir="auto">
                    {selectedClass.name}
                  </p>
                  <h1 className="text-3xl font-black text-foreground">
                    {t("teacher.weeklyPlan.title")}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-bold text-muted-foreground">
                  {t("teacher.weeklyPlan.classLabel")}
                  <select
                    value={selectedClass.id}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="ms-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                  >
                    {activeClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  <Save size={16} />
                  {t("teacher.weeklyPlan.save")}
                </button>
              </div>
            </div>

            {errorKey && (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300"
              >
                {t(`teacher.weeklyPlan.errors.${errorKey}`)}
              </p>
            )}

            {savedAt && !errorKey && (
              <p className="mb-4 text-sm font-bold text-primary">
                {t("teacher.weeklyPlan.savedAt", { time: savedAt })}
              </p>
            )}

            <p className="mb-1 text-xs font-bold text-muted-foreground">
              {t("teacher.weeklyPlan.timeHint")}
            </p>
            <p className="mb-4 text-xs font-bold text-muted-foreground">
              {t("teacher.weeklyPlan.inputLimit")}
            </p>

            {selectedClass.lessons.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                {t("teacher.weeklyPlan.noLessons")}
              </p>
            ) : (
              <>
                <datalist id="weekly-plan-lessons">
                  {selectedClass.lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.title} />
                  ))}
                </datalist>

                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-muted/70 text-foreground">
                      <tr>
                        <th className="border-b border-border px-3 py-3 text-start font-black">
                          {t("teacher.weeklyPlan.time")}
                        </th>
                        {WEEK_DAYS.map((day) => (
                          <th
                            key={day}
                            className="border-b border-border px-3 py-3 text-center font-black"
                          >
                            {t(`teacher.days.${day}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {draft.rows.map((row) => {
                        const invalid = errorKey && rowProblem(row, draft.rows);
                        return (
                          <tr key={row.id}>
                            <td className="border-b border-border px-3 py-3">
                              <div className="flex items-center gap-2" dir="ltr">
                                <input
                                  type="time"
                                  value={row.from}
                                  onChange={(event) =>
                                    updateTime(row.id, "from", event.target.value)
                                  }
                                  aria-label={t("teacher.weeklyPlan.startTime")}
                                  aria-invalid={invalid ? true : undefined}
                                  className={timeInputClass(invalid)}
                                />
                                <span className="font-black text-muted-foreground">–</span>
                                <input
                                  type="time"
                                  value={row.to}
                                  onChange={(event) =>
                                    updateTime(row.id, "to", event.target.value)
                                  }
                                  aria-label={t("teacher.weeklyPlan.endTime")}
                                  aria-invalid={invalid ? true : undefined}
                                  className={timeInputClass(invalid)}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  disabled={draft.rows.length <= 1}
                                  aria-label={t("teacher.weeklyPlan.removeSlot")}
                                  title={t("teacher.weeklyPlan.removeSlot")}
                                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition hover:border-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                            {WEEK_DAYS.map((day) => (
                              <td
                                key={`${day}-${row.id}`}
                                className="border-b border-border px-2 py-3 text-center"
                              >
                                <input
                                  type="text"
                                  list="weekly-plan-lessons"
                                  value={draft.cells?.[day]?.[row.id] ?? ""}
                                  onChange={(event) =>
                                    updateCell(day, row.id, event.target.value)
                                  }
                                  maxLength={MAX_LESSON_NAME_LENGTH}
                                  placeholder={t("teacher.weeklyPlan.lessonPlaceholder")}
                                  dir="auto"
                                  className="min-w-[120px] rounded-xl border border-border bg-background px-2 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addRow}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                >
                  <Plus size={16} aria-hidden="true" />
                  {t("teacher.weeklyPlan.addSlot")}
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
