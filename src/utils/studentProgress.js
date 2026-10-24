// Pure helpers for the student progress page. All scores are out of 20 and come
// from lesson.gradeBook entries: { date: "YYYY-MM-DD", scores: { [studentId]: n } }.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const toIso = (value) => String(value ?? "").slice(0, 10);

export const round2 = (n) => Math.round(n * 100) / 100;

const mean = (list) =>
  list.length ? list.reduce((sum, n) => sum + n, 0) / list.length : null;

export const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const daysBetween = (a, b) =>
  Math.round(
    (new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000,
  );

const scoresInRange = (lesson, studentId, range) =>
  (lesson.gradeBook ?? [])
    .filter((entry) => {
      const date = toIso(entry.date);
      return date >= range.from && date <= range.to;
    })
    .map((entry) => entry.scores?.[studentId])
    .filter((value) => typeof value === "number" && Number.isFinite(value));

// Lessons of the class in which the student takes part.
export const lessonsOfStudent = (classData, studentId) =>
  (classData?.lessons ?? []).filter((lesson) =>
    lesson.students.some((s) => s.id === studentId),
  );

// Default periods: the exam history of the student is split in two halves.
export function defaultRanges(lessons) {
  const dates = lessons
    .flatMap((lesson) =>
      (lesson.gradeBook ?? []).map((entry) => toIso(entry.date)),
    )
    .filter((date) => ISO_DATE.test(date))
    .sort();
  if (dates.length === 0)
    return { old: { from: "", to: "" }, new: { from: "", to: "" } };

  const min = dates[0];
  const max = dates[dates.length - 1];
  const span = daysBetween(min, max);
  if (span < 1)
    return { old: { from: min, to: min }, new: { from: min, to: min } };

  const middle = addDays(min, Math.floor(span / 2));
  return {
    old: { from: min, to: middle },
    new: { from: addDays(middle, 1), to: max },
  };
}

// Returns an error key (under teacher.progress.errors) or null.
export function validateRanges(oldRange, newRange) {
  if (!oldRange.from || !oldRange.to || !newRange.from || !newRange.to)
    return "missingDates";
  if (oldRange.from > oldRange.to || newRange.from > newRange.to)
    return "invalidRange";
  if (newRange.from <= oldRange.to) return "overlap";
  return null;
}

export function compareStudent(classData, studentId, oldRange, newRange) {
  const lessons = lessonsOfStudent(classData, studentId);

  const rows = lessons.map((lesson) => {
    const oldAvg = mean(scoresInRange(lesson, studentId, oldRange));
    const newAvg = mean(scoresInRange(lesson, studentId, newRange));

    // Best student of this lesson in the newer period.
    let top = null;
    lesson.students.forEach((s) => {
      const avg = mean(scoresInRange(lesson, s.id, newRange));
      if (avg !== null && (!top || avg > top.avg))
        top = { id: s.id, name: s.name, avg };
    });

    const isTop = Boolean(
      top && newAvg !== null && round2(newAvg) >= round2(top.avg),
    );
    return {
      id: lesson.id,
      title: lesson.title,
      oldAvg,
      newAvg,
      change: oldAvg !== null && newAvg !== null ? newAvg - oldAvg : null,
      top,
      isTop,
      gap: top && newAvg !== null ? Math.max(0, top.avg - newAvg) : null,
    };
  });

  const collect = (id, range) =>
    (classData?.lessons ?? [])
      .filter((lesson) => lesson.students.some((s) => s.id === id))
      .flatMap((lesson) => scoresInRange(lesson, id, range));

  const oldScores = collect(studentId, oldRange);
  const newScores = collect(studentId, newRange);
  const oldAvg = mean(oldScores);
  const newAvg = mean(newScores);
  const change = oldAvg !== null && newAvg !== null ? newAvg - oldAvg : null;

  // First student of the class = highest average over all exams of the newer period.
  let top = null;
  (classData?.students ?? []).forEach((s) => {
    const avg = mean(collect(s.id, newRange));
    if (avg !== null && (!top || avg > top.avg))
      top = { id: s.id, name: s.name, avg };
  });
  const isTop = Boolean(
    top && newAvg !== null && round2(newAvg) >= round2(top.avg),
  );

  return {
    rows,
    overall: {
      oldAvg,
      newAvg,
      change,
      percent: change !== null && oldAvg > 0 ? change / oldAvg : null,
      oldCount: oldScores.length,
      newCount: newScores.length,
    },
    top,
    isTop,
    gap: top && newAvg !== null ? Math.max(0, top.avg - newAvg) : null,
  };
}

const numericValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export function averageForStudentInLesson(lesson, studentId) {
  if (!lesson) return null;

  const examScores = (lesson.gradeBook ?? [])
    .map((entry) => entry.scores?.[studentId])
    .map((value) => numericValue(value))
    .filter((value) => value !== null);

  if (examScores.length > 0) {
    return round2(mean(examScores));
  }

  const student = (lesson.students ?? []).find(
    (entry) => entry.id === studentId,
  );
  const fallback = student
    ? numericValue(student.score ?? student.grade)
    : null;
  return fallback !== null ? round2(fallback) : null;
}

export function buildLessonRankings(classData) {
  return (classData?.lessons ?? []).map((lesson) => {
    const rows = (lesson.students ?? [])
      .map((student) => ({
        id: student.id,
        name: student.name,
        parentName: student.parentName,
        average: averageForStudentInLesson(lesson, student.id),
      }))
      .filter((row) => row.average !== null)
      .sort((a, b) => b.average - a.average)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    const average = rows.length
      ? round2(mean(rows.map((row) => row.average)))
      : null;

    return { lesson, rows, average };
  });
}

export function buildClassRanking(classData) {
  const students = classData?.students ?? [];

  return students
    .map((student) => {
      const lessonAverages = (classData?.lessons ?? [])
        .map((lesson) => averageForStudentInLesson(lesson, student.id))
        .filter((value) => value !== null);

      return {
        id: student.id,
        name: student.name,
        parentName: student.parentName,
        average: lessonAverages.length ? round2(mean(lessonAverages)) : null,
      };
    })
    .filter((row) => row.average !== null)
    .sort((a, b) => b.average - a.average)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
