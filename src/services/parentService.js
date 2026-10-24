// Parent panel data layer.
//
// Everything a parent can see is produced here, from the signed-in parent's
// mobile number. Components never receive the raw school data, so a page cannot
// accidentally render another family's records.
//
// SECURITY NOTE: this project is frontend-only. The session and every record
// live in this browser's localStorage, so this filter is an application-level
// guard, NOT server-side security. A person who can edit localStorage can still
// read the raw data. Real isolation needs a backend that enforces the same
// rules per authenticated parent.
import {
  addDays,
  averageForStudentInLesson,
  buildClassRanking,
  buildLessonRankings,
  compareStudent,
  defaultRanges,
  lessonsOfStudent,
  round2,
  validateRanges,
} from "../utils/studentProgress";
import { normalizePhone } from "../utils/jalali";
import { buildStudentReportCard, comparePeriods } from "./reportService";
import { schoolBlockReason } from "./schoolRegistry";
import { readStorage, writeStorage } from "./storage";

const sameMobile = (a, b) =>
  Boolean(a && b) && normalizePhone(a) === normalizePhone(b);

const resolveWeeklyPlan = (teacherClass, schoolClass) => {
  if (teacherClass?.weeklyPlan && typeof teacherClass.weeklyPlan === "object") {
    return teacherClass.weeklyPlan;
  }
  if (schoolClass?.weeklyPlan && typeof schoolClass.weeklyPlan === "object") {
    return schoolClass.weeklyPlan;
  }
  return null;
};

const mean = (list) =>
  list.length ? list.reduce((sum, n) => sum + n, 0) / list.length : null;
const isNum = (value) => typeof value === "number" && Number.isFinite(value);

// Only plain http(s) links may reach the UI (blocks javascript:, data:, ...).
const safeHttpUrl = (value) => {
  try {
    const url = new URL(String(value ?? "").trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
};

// `target` of an online class/exam: "all", an array of lesson ids, or (older
// saves) a single lesson id.
export const isTargeted = (target, lessonIds) => {
  if (target == null || target === "all") return true;
  const ids = Array.isArray(target) ? target : [target];
  return ids.some((id) => lessonIds.includes(id));
};

const liveSession = (saved, cls, lessonIds) => {
  const link = safeHttpUrl(saved?.link);
  if (!saved || !link || !isTargeted(saved.target, lessonIds)) return null;
  const live = Boolean(saved.live);
  return {
    classId: cls.id,
    className: cls.name,
    title: saved.title || cls.name,
    live,
    // The join link is only handed to the parent while the teacher has opened it.
    link: live ? link : null,
    openedAt: live ? (saved.openedAt ?? null) : null,
  };
};

/* ------------------------- children of the teacher panel ------------------------- */

function buildTeacherChild(student, classList, s) {
  const schoolClassMap = new Map(
    (s.appData?.classes ?? []).map((cls) => [cls.id, cls]),
  );
  const out = {
    key: `teacher:${student.id}`,
    id: student.id,
    name: student.name,
    source: "teacher",
    classes: [],
    subjects: [],
    attendance: [],
    lessonPresence: [],
    grades: [],
    weeklyPlans: [],
    assignments: [],
    onlineClasses: [],
    onlineExams: [],
    ranks: [],
    progress: [],
    threads: [],
    importantAlerts: [],
    average: null,
    report: null,
  };

  classList.forEach((cls) => {
    const lessons = lessonsOfStudent(cls, student.id);
    const lessonIds = lessons.map((lesson) => lesson.id);
    out.classes.push({
      id: cls.id,
      name: cls.name,
      grade: cls.grade,
      schoolYear: cls.schoolYear,
    });
    out.threads.push({
      classId: cls.id,
      className: cls.name,
      studentId: student.id,
    });

    const lessonRankings = buildLessonRankings(cls);
    lessons.forEach((lesson) => {
      const ranking = lessonRankings.find(
        (entry) => entry.lesson.id === lesson.id,
      );
      const mine = ranking?.rows.find((row) => row.id === student.id);
      const subjectId = `${cls.id}:${lesson.id}`;
      out.subjects.push({
        id: subjectId,
        classId: cls.id,
        className: cls.name,
        title: lesson.title,
        schedule: lesson.schedule ?? null,
        teacherName: null,
        average: averageForStudentInLesson(lesson, student.id),
        // Only the child's own position: never other students' names or scores.
        rank: mine?.rank ?? null,
        size: ranking?.rows.length ?? 0,
      });

      const me = lesson.students.find((x) => x.id === student.id);
      if (me?.presence) {
        out.lessonPresence.push({
          id: subjectId,
          subject: lesson.title,
          className: cls.name,
          status: me.presence,
        });
      }

      (lesson.gradeBook ?? []).forEach((entry) => {
        const score = entry.scores?.[student.id];
        if (!isNum(score)) return;
        out.grades.push({
          id: `${subjectId}:${entry.id}`,
          subjectId,
          subject: lesson.title,
          className: cls.name,
          title: entry.assessmentName ?? null,
          titleKey: entry.assessmentKey ?? null,
          date: entry.date,
          score,
          max: 20,
          note: "",
        });
      });
    });

    const classRank = buildClassRanking(cls).find(
      (row) => row.id === student.id,
    );
    if (classRank) {
      out.ranks.push({
        classId: cls.id,
        className: cls.name,
        rank: classRank.rank,
        size: buildClassRanking(cls).length,
      });
    }

    // Whole-class attendance days, restricted to this child's own mark.
    Object.entries(s.classAttendance?.[cls.id] ?? {}).forEach(
      ([date, marks]) => {
        const status = marks?.[student.id];
        if (!status) return;
        out.attendance.push({
          id: `${cls.id}:${date}`,
          date,
          status,
          subject: cls.name,
          subjectId: null,
          classId: cls.id,
        });
      },
    );

    const plan = resolveWeeklyPlan(cls, schoolClassMap.get(cls.id));
    out.weeklyPlans.push({
      classId: cls.id,
      className: cls.name,
      plan,
    });

    (s.studentAlerts ?? [])
      .filter(
        (alert) => alert.classId === cls.id && alert.studentId === student.id,
      )
      .forEach((alert) => {
        out.importantAlerts.push({
          ...alert,
          createdAt: alert.createdAt ?? new Date().toISOString(),
        });
      });

    (s.assignments ?? [])
      .filter(
        (a) =>
          a.classId === cls.id &&
          (a.lessonId === "all" || lessonIds.includes(a.lessonId)),
      )
      .forEach((a) => {
        const lesson = lessons.find((item) => item.id === a.lessonId);
        out.assignments.push({
          id: a.id,
          classId: cls.id,
          className: cls.name,
          subject: lesson?.title ?? null,
          title: a.title,
          description: a.description ?? "",
          dueDate: a.dueDate,
          createdAt: a.createdAt ?? null,
        });
      });

    const onlineClass = liveSession(s.onlineClasses?.[cls.id], cls, lessonIds);
    if (onlineClass) out.onlineClasses.push(onlineClass);
    const onlineExam = liveSession(s.onlineExams?.[cls.id], cls, lessonIds);
    if (onlineExam) out.onlineExams.push(onlineExam);

    // Progress between the two halves of the child's exam history (existing util).
    const ranges = defaultRanges(lessons);
    if (!validateRanges(ranges.old, ranges.new)) {
      const compared = compareStudent(cls, student.id, ranges.old, ranges.new);
      if (compared.overall.oldCount > 0 && compared.overall.newCount > 0) {
        out.progress.push({
          classId: cls.id,
          className: cls.name,
          oldAvg: compared.overall.oldAvg,
          newAvg: compared.overall.newAvg,
          change: compared.overall.change,
          rows: compared.rows.map((row) => ({
            id: row.id,
            title: row.title,
            oldAvg: row.oldAvg,
            newAvg: row.newAvg,
            change: row.change,
          })),
        });
      }
    }
  });

  const averages = out.subjects.map((subject) => subject.average).filter(isNum);
  out.average = averages.length ? round2(mean(averages)) : null;
  return out;
}

const buildTeacherChildren = (mobile, s) => {
  const byId = new Map();
  (s.teacherClasses ?? [])
    .filter((cls) => !cls.archived && !cls.isExample)
    .forEach((cls) => {
      (cls.students ?? []).forEach((student) => {
        if (!sameMobile(student.parentMobile, mobile)) return;
        const entry = byId.get(student.id) ?? { student, classes: [] };
        entry.classes.push(cls);
        byId.set(student.id, entry);
      });
    });
  return [...byId.values()].map(({ student, classes }) =>
    buildTeacherChild(student, classes, s),
  );
};

/* ------------------------ children of the school records ------------------------ */

function buildSchoolChild(student, d) {
  const cls = (d.classes ?? []).find((c) => c.id === student.classId);
  const courseIds = new Set(
    (d.enrollments ?? [])
      .filter((e) => e.studentId === student.id)
      .map((e) => e.courseId),
  );
  const courses = (d.courses ?? []).filter((c) => courseIds.has(c.id));
  const courseName = (id) =>
    (d.courses ?? []).find((c) => c.id === id)?.name ?? "";

  // Own rank among classmates, from their grade ratios. Names/scores of the
  // classmates are never returned.
  const ratio = (studentId) => {
    const list = (d.grades ?? []).filter((g) => g.studentId === studentId);
    return list.length ? mean(list.map((g) => g.score / (g.max || 20))) : null;
  };
  const ranking = (d.students ?? [])
    .filter((x) => x.classId === student.classId)
    .map((x) => ({ id: x.id, value: ratio(x.id) }))
    .filter((row) => row.value !== null)
    .sort((a, b) => b.value - a.value);
  const position = ranking.findIndex((row) => row.id === student.id);

  return {
    key: `school:${student.id}`,
    id: student.id,
    name: student.name,
    source: "school",
    classes: cls
      ? [{ id: cls.id, name: cls.name, grade: cls.level ?? "", schoolYear: "" }]
      : [],
    weeklyPlans: cls
      ? [
          {
            classId: cls.id,
            className: cls.name,
            plan: resolveWeeklyPlan(null, cls),
          },
        ]
      : [],
    importantAlerts: (d.studentAlerts ?? [])
      .filter((alert) => alert.studentId === student.id)
      .map((alert) => ({ ...alert })),
    subjects: courses.map((course) => ({
      id: course.id,
      classId: course.classId,
      className: cls?.name ?? "",
      title: course.name,
      schedule: null,
      teacherName:
        (d.teachers ?? []).find((t) => t.id === course.teacherId)?.name ?? null,
      average: null,
      rank: null,
      size: 0,
    })),
    attendance: (d.attendance ?? [])
      .filter((a) => a.studentId === student.id)
      .map((a) => ({
        id: a.id,
        date: a.date,
        status: a.status,
        subject: courseName(a.courseId),
        subjectId: a.courseId,
        classId: student.classId,
      })),
    lessonPresence: [],
    grades: (d.grades ?? [])
      .filter((g) => g.studentId === student.id)
      .map((g) => ({
        id: g.id,
        subjectId: g.courseId,
        subject: courseName(g.courseId),
        className: cls?.name ?? "",
        title: g.title ?? null,
        titleKey: null,
        date: g.date,
        score: g.score,
        max: g.max || 20,
        note: g.note ?? "",
      })),
    assignments: [],
    onlineClasses: [],
    onlineExams: [],
    ranks:
      position >= 0 && cls
        ? [
            {
              classId: cls.id,
              className: cls.name,
              rank: position + 1,
              size: ranking.length,
            },
          ]
        : [],
    progress: [],
    threads: [],
    average: null,
    report: null,
  };
}

// Children of a school that is not active (pending, rejected, suspended) are
// hidden from the parent together with the school.
const schoolIsOpen = (appData, student) =>
  !Array.isArray(appData?.schools) ||
  !schoolBlockReason(appData, student.schoolId);

const buildSchoolChildren = (mobile, appData, studentAlerts = []) =>
  (appData?.students ?? [])
    .filter(
      (student) =>
        sameMobile(student.parentMobile, mobile) &&
        schoolIsOpen(appData, student),
    )
    .map((student) => buildSchoolChild(student, { ...appData, studentAlerts }));

/* ----------------------------------- public API ----------------------------------- */

// sources: { appData, teacherClasses, assignments, onlineClasses, onlineExams, classAttendance, studentAlerts }
export function buildParentChildren(mobile, sources) {
  if (!normalizePhone(mobile ?? "")) return [];
  return [
    ...buildSchoolChildren(
      mobile,
      sources.appData,
      sources.studentAlerts ?? [],
    ),
    ...buildTeacherChildren(mobile, sources),
  ];
}

// Async report for children of the school records, using the existing report
// service. The ownership check runs again here, on the stored data.
export async function getSchoolChildReport(mobile, studentId) {
  const data = readStorage("appData", null);
  const student = (data?.students ?? []).find((s) => s.id === studentId);
  if (
    !student ||
    !sameMobile(student.parentMobile, mobile) ||
    !schoolIsOpen(data, student)
  ) {
    throw Object.assign(new Error("Not allowed"), { code: "forbidden" });
  }

  const everything = { fromDate: "1970-01-01", toDate: "2999-12-31" };
  const card = await buildStudentReportCard({
    schoolId: student.schoolId,
    studentId,
    ...everything,
  });

  const dates = [
    ...new Set(
      (data.grades ?? [])
        .filter((g) => g.studentId === studentId)
        .map((g) => String(g.date).slice(0, 10)),
    ),
  ].sort();
  let progress = null;
  if (dates.length >= 2) {
    const span = Math.round(
      (new Date(`${dates[dates.length - 1]}T00:00:00Z`) -
        new Date(`${dates[0]}T00:00:00Z`)) /
        86400000,
    );
    const middle = addDays(dates[0], Math.floor(span / 2));
    const compared = await comparePeriods({
      schoolId: student.schoolId,
      studentId,
      firstRange: { fromDate: dates[0], toDate: middle },
      secondRange: {
        fromDate: addDays(middle, 1),
        toDate: dates[dates.length - 1],
      },
    });
    if (compared.overallBefore !== null && compared.overallAfter !== null)
      progress = compared;
  }

  return {
    overallAverage: card.overallAverage,
    records: card.records.map((r) => ({
      courseId: r.courseId,
      courseName: r.courseName,
      count: r.count,
      average: r.average,
    })),
    attendanceSummary: card.attendanceSummary,
    progress,
  };
}

// Messages of ONE conversation, restricted to the parent they were exchanged with.
export const parentThreadMessages = (messages, mobile, thread) =>
  messages
    .filter(
      (m) =>
        m.classId === thread.classId &&
        m.studentId === thread.studentId &&
        sameMobile(m.parentMobile, mobile),
    )
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

// The thread must belong to one of the parent's own children.
export const findOwnThread = (children, childKey, classId) => {
  const child = children.find((c) => c.key === childKey);
  const thread = child?.threads.find((t) => t.classId === classId);
  return thread ? { child, thread } : null;
};

export const summarizeAttendance = (records) => {
  const counts = { present: 0, absent: 0, late: 0 };
  records.forEach((r) => {
    if (r.status in counts) counts[r.status] += 1;
  });
  const total = counts.present + counts.absent + counts.late;
  return {
    ...counts,
    total,
    rate: total
      ? Math.round(((counts.present + counts.late) / total) * 100)
      : null,
  };
};

export const overallGradeAverage = (grades = []) => {
  const scores = grades
    .map((grade) => {
      const max = Number(grade?.max ?? 20);
      const score = Number(grade?.score ?? 0);
      return max > 0 ? (score / max) * 20 : null;
    })
    .filter((value) => value != null && Number.isFinite(value));

  if (!scores.length) return null;
  return round2(scores.reduce((sum, value) => sum + value, 0) / scores.length);
};

export const assignmentCompletionSummary = (assignments = [], today) => {
  const total = assignments.length;
  const done = assignments.filter(
    (assignment) => String(assignment?.dueDate ?? "") < String(today ?? ""),
  ).length;
  const open = total - done;
  const rate = total ? Math.round((done / total) * 100) : null;

  return { total, open, done, rate };
};

export const dueState = (dueDate, today) =>
  dueDate < today ? "overdue" : dueDate === today ? "dueToday" : "upcoming";

// Progress of a child in one shape, whichever record system it comes from.
export const progressOf = (child) => {
  if (child.source === "teacher") {
    return child.progress.map((p) => ({
      id: p.classId,
      label: p.className,
      oldAvg: p.oldAvg,
      newAvg: p.newAvg,
      change: p.change,
      rows: p.rows,
    }));
  }
  const p = child.report?.progress;
  if (!p) return [];
  return [
    {
      id: child.id,
      label: child.classes[0]?.name ?? "",
      oldAvg: p.overallBefore,
      newAvg: p.overallAfter,
      change: p.overallDifference,
      rows: p.perCourse
        .filter((row) => row.status !== "not-enough-data")
        .map((row) => ({
          id: row.courseId,
          title: row.courseName,
          oldAvg: row.averageBefore,
          newAvg: row.averageAfter,
          change: row.difference,
        })),
    },
  ];
};

// One-glance summary of a child for the family overview. Built only from the
// child object the parent already owns (no extra data is read here).
export const summarizeChild = (child, today) => {
  const attendance = summarizeAttendance(child.attendance);
  const latestAttendance = [...child.attendance].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  )[0];
  const assignments = child.assignments ?? [];
  return {
    average: overallGradeAverage(child.grades),
    attendanceRate: attendance.rate,
    attendanceTotal: attendance.total,
    openAssignments: assignments.filter((a) => a.dueDate >= today).length,
    overdueAssignments: assignments.filter((a) => a.dueDate < today).length,
    lastAbsentDate:
      latestAttendance?.status === "absent" ? latestAttendance.date : null,
    liveCount:
      (child.onlineClasses ?? []).filter((s) => s.live).length +
      (child.onlineExams ?? []).filter((s) => s.live).length,
    teacherAlertCount: (child.importantAlerts ?? []).length,
    // Distinct teacher names. Only known for children of the school records;
    // the teacher panel does not store a teacher name on its classes.
    teachers: [
      ...new Set(
        (child.subjects ?? []).map((s) => s.teacherName).filter(Boolean),
      ),
    ],
  };
};

// Children whose displayed name is shared, so the switcher can tell them apart.
export const duplicateNames = (children) => {
  const seen = new Map();
  children.forEach((c) => seen.set(c.name, (seen.get(c.name) ?? 0) + 1));
  return new Set([...seen].filter(([, n]) => n > 1).map(([name]) => name));
};

/* ------------------------------ parent removes a child ------------------------------ */

// A parent "removes" a child from their own panel by unlinking their mobile
// number from that student. The school's record (grades, attendance, class)
// is kept; only the school manager can delete the student itself.
// Children of the teacher panel are unlinked by the page (teacher store).
export function removeSchoolChildForParent(mobile, studentId) {
  const session = readStorage("session", null);
  if (session?.role !== "parent" || !sameMobile(session.mobile, mobile)) {
    throw Object.assign(new Error("forbidden"), { code: "forbidden" });
  }
  const data = readStorage("appData", null);
  const student = (data?.students ?? []).find((s) => s.id === studentId);
  if (!student || !sameMobile(student.parentMobile, mobile)) {
    throw Object.assign(new Error("notFound"), { code: "notFound" });
  }
  writeStorage("appData", {
    ...data,
    students: data.students.map((s) =>
      s.id === studentId
        ? { ...s, parentMobile: "", parentUnlinkedAt: new Date().toISOString() }
        : s,
    ),
  });
}
