// Student definition for the school manager: one student at a time or a whole
// Excel sheet. Everything is scoped to the manager's own school.
//
// FRONTEND-ONLY: these are application-level guards over localStorage. With a
// backend, the same validation must run on the server.
import { isSuperAdminMobile } from "./schoolRegistry";
import { isValidIranianMobile, normalizePhone } from "../utils/jalali";
import { readStorage, writeStorage } from "./storage";

const STORAGE_KEY = "appData";
const SESSION_KEY = "session";

const studentError = (code) => Object.assign(new Error(code), { code });

const requireAdminSession = () => {
  const session = readStorage(SESSION_KEY, null);
  if (session?.role !== "admin" || !session.schoolId) {
    throw studentError("forbidden");
  }
  return session;
};

// Excel often turns 09123456789 into the number 9123456789 and may use
// Persian digits; bring every spelling to 09xxxxxxxxx.
export function cleanMobile(value) {
  let text = normalizePhone(String(value ?? "")).replace(/[^\d+]/g, "");
  if (text.startsWith("+98")) text = `0${text.slice(3)}`;
  else if (text.startsWith("0098")) text = `0${text.slice(4)}`;
  else if (text.startsWith("98") && text.length === 12) text = `0${text.slice(2)}`;
  else if (/^9\d{9}$/.test(text)) text = `0${text}`;
  return text;
}

const norm = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/* ------------------------------ validation + plan ------------------------------ */

// Turns raw candidates [{ name, className, parentMobile }] into a plan:
// rows with a status ("ok" | "error" | "duplicate") and the classes that would
// be created. Nothing is saved here, so it is safe to call for a preview.
export function planStudents(candidates, { schoolId, data }) {
  const classes = (data.classes ?? []).filter((c) => c.schoolId === schoolId);
  const students = (data.students ?? []).filter((s) => s.schoolId === schoolId);
  const classByName = new Map(classes.map((c) => [norm(c.name), c]));
  const seen = new Set(
    students.map((s) => `${norm(s.name)}|${cleanMobile(s.parentMobile)}`),
  );
  const staffMobiles = new Set(
    [...(data.teachers ?? []), ...(data.admins ?? [])].map((p) =>
      cleanMobile(p.mobile),
    ),
  );

  const rows = candidates.map((candidate, index) => {
    const name = String(candidate.name ?? "").replace(/\s+/g, " ").trim();
    const className = String(candidate.className ?? "").replace(/\s+/g, " ").trim();
    const parentMobile = cleanMobile(candidate.parentMobile);
    const row = {
      line: candidate.line ?? index + 1,
      name,
      className,
      parentMobile,
      status: "ok",
      error: null,
      newClass: false,
    };

    if (!name) return { ...row, status: "error", error: "noName" };
    if (!className) return { ...row, status: "error", error: "noClass" };
    if (!isValidIranianMobile(parentMobile)) {
      return { ...row, status: "error", error: "badMobile" };
    }
    // A mobile number identifies ONE account: a parent number that already
    // belongs to a teacher or manager would sign in as that teacher/manager.
    if (isSuperAdminMobile(parentMobile) || staffMobiles.has(parentMobile)) {
      return { ...row, status: "error", error: "staffMobile" };
    }
    const key = `${norm(name)}|${parentMobile}`;
    if (seen.has(key)) return { ...row, status: "duplicate", error: "duplicate" };
    seen.add(key);
    return { ...row, newClass: !classByName.has(norm(className)) };
  });

  return {
    rows,
    okCount: rows.filter((r) => r.status === "ok").length,
    newClasses: [
      ...new Set(rows.filter((r) => r.status === "ok" && r.newClass).map((r) => r.className)),
    ],
  };
}

/* -------------------------------- saving -------------------------------- */

// Saves every "ok" row of a plan for the signed-in manager's school.
export function saveStudents(candidates) {
  const session = requireAdminSession();
  const data = readStorage(STORAGE_KEY, {}) || {};
  const plan = planStudents(candidates, { schoolId: session.schoolId, data });
  const okRows = plan.rows.filter((row) => row.status === "ok");
  if (!okRows.length) throw studentError("nothingToSave");

  const stamp = Date.now();
  const classes = [...(data.classes ?? [])];
  const classIdByName = new Map(
    classes
      .filter((c) => c.schoolId === session.schoolId)
      .map((c) => [norm(c.name), c.id]),
  );
  plan.newClasses.forEach((name, index) => {
    const id = `class-${stamp}-${index}`;
    classes.push({ id, schoolId: session.schoolId, name, level: "" });
    classIdByName.set(norm(name), id);
  });

  const created = okRows.map((row, index) => ({
    id: `student-${stamp}-${index}`,
    schoolId: session.schoolId,
    name: row.name,
    classId: classIdByName.get(norm(row.className)),
    parentMobile: row.parentMobile,
    createdAt: new Date().toISOString(),
    createdByAdminId: session.userId,
  }));

  writeStorage(STORAGE_KEY, {
    ...data,
    classes,
    students: [...(data.students ?? []), ...created],
  });
  return {
    saved: created.length,
    skipped: plan.rows.length - created.length,
    newClasses: plan.newClasses.length,
  };
}

/* --------------------------------- Excel --------------------------------- */

// Header names we accept (Persian, English, with or without spaces).
const COLUMN_ALIASES = {
  name: ["نام", "نامدانشآموز", "نامونامخانوادگی", "دانشآموز", "نامنامخانوادگی", "name", "studentname", "student", "fullname"],
  className: ["کلاس", "نامکلاس", "پایه", "class", "classname", "grade"],
  parentMobile: ["موبایلوالد", "شمارهموبایلوالد", "شمارهوالد", "تلفنوالد", "موبایل", "شمارهموبایل", "parentmobile", "parentphone", "mobile", "phone"],
};

const headerKey = (value) =>
  norm(value).replace(/[\s_\-‌()]/g, "").replace(/[‌]/g, "");

export function mapSheetRows(sheetRows) {
  const rows = (sheetRows ?? []).filter((row) =>
    (row ?? []).some((cell) => String(cell ?? "").trim() !== ""),
  );
  if (!rows.length) throw studentError("emptyFile");

  const header = rows[0].map(headerKey);
  const indexOf = (field) =>
    header.findIndex((cell) => COLUMN_ALIASES[field].map(headerKey).includes(cell));
  const index = {
    name: indexOf("name"),
    className: indexOf("className"),
    parentMobile: indexOf("parentMobile"),
  };
  if (Object.values(index).some((i) => i < 0)) throw studentError("missingColumns");

  return rows.slice(1).map((row, i) => ({
    line: i + 2, // line number in the sheet (row 1 is the header)
    name: row[index.name],
    className: row[index.className],
    parentMobile: row[index.parentMobile],
  }));
}

export async function readStudentsFromExcel(file) {
  if (!file) throw studentError("emptyFile");
  if (!/\.xlsx$/i.test(file.name || "")) throw studentError("badFileType");
  if (file.size > 5 * 1024 * 1024) throw studentError("fileTooBig");
  const { readSheet } = await import("read-excel-file/universal");
  let sheet;
  try {
    sheet = await readSheet(await file.arrayBuffer());
  } catch {
    throw studentError("unreadableFile");
  }
  const candidates = mapSheetRows(sheet);
  if (candidates.length > 2000) throw studentError("tooManyRows");
  return candidates;
}

export async function downloadStudentTemplate() {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const bold = { fontWeight: "bold" };
  await writeExcelFile([
    [
      { value: "نام دانش‌آموز", ...bold },
      { value: "کلاس", ...bold },
      { value: "موبایل والد", ...bold },
    ],
    ["علی رضایی", "هفتم الف", { value: "09120000088", type: String }],
    ["سارا محمدی", "هفتم الف", { value: "09120000088", type: String }],
  ]).toFile("students-template.xlsx");
}

/* ------------------------------ removing students ------------------------------ */

// Finds a student of the manager's own school or fails; never touches others.
const ownStudent = (data, session, studentId) => {
  const student = (data.students ?? []).find(
    (s) => s.id === studentId && s.schoolId === session.schoolId,
  );
  if (!student) throw studentError("notFound");
  return student;
};

const courseIdsOfClass = (data, schoolId, classId) =>
  new Set(
    (data.courses ?? [])
      .filter((c) => c.schoolId === schoolId && c.classId === classId)
      .map((c) => c.id),
  );

// Takes the student out of their class and out of that class's courses
// (so they leave those teachers' lists). The student stays in the school.
export function removeStudentFromClass(studentId) {
  const session = requireAdminSession();
  const data = readStorage(STORAGE_KEY, {}) || {};
  const student = ownStudent(data, session, studentId);
  const courseIds = courseIdsOfClass(data, session.schoolId, student.classId);
  writeStorage(STORAGE_KEY, {
    ...data,
    students: data.students.map((s) =>
      s.id === studentId ? { ...s, classId: "" } : s,
    ),
    enrollments: (data.enrollments ?? []).filter(
      (e) => !(e.studentId === studentId && courseIds.has(e.courseId)),
    ),
  });
}

// Takes the student out of ONE course, i.e. out of that teacher's list.
export function removeStudentFromCourse(studentId, courseId) {
  const session = requireAdminSession();
  const data = readStorage(STORAGE_KEY, {}) || {};
  ownStudent(data, session, studentId);
  const course = (data.courses ?? []).find(
    (c) => c.id === courseId && c.schoolId === session.schoolId,
  );
  if (!course) throw studentError("notFound");
  writeStorage(STORAGE_KEY, {
    ...data,
    enrollments: (data.enrollments ?? []).filter(
      (e) => !(e.studentId === studentId && e.courseId === courseId),
    ),
  });
}

// Deletes the student from the school together with their enrollments,
// grades and attendance records.
export function deleteStudent(studentId) {
  const session = requireAdminSession();
  const data = readStorage(STORAGE_KEY, {}) || {};
  ownStudent(data, session, studentId);
  writeStorage(STORAGE_KEY, {
    ...data,
    students: data.students.filter((s) => s.id !== studentId),
    enrollments: (data.enrollments ?? []).filter((e) => e.studentId !== studentId),
    grades: (data.grades ?? []).filter((g) => g.studentId !== studentId),
    attendance: (data.attendance ?? []).filter((a) => a.studentId !== studentId),
  });
}
