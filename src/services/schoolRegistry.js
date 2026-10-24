// School registry: schools, their managers (admins), approval and suspension.
//
// SECURITY NOTE: frontend-only. Every rule here is an application-level guard;
// anyone who can edit this browser's localStorage can bypass it. When a backend
// arrives, replace this module with API calls that enforce the same rules on
// the server (and decide the super admin there).
import { SUPER_ADMIN_ID, SUPER_ADMIN_MOBILE } from "../config/superAdmin";
import { demoSeed } from "../data/demoSeed";
import { isValidIranianMobile, normalizePhone } from "../utils/jalali";
import { readStorage, writeStorage } from "./storage";

const STORAGE_KEY = "appData";
const SESSION_KEY = "session";

export const SCHOOL_STATUS = {
  pending: "pending",
  active: "active",
  suspended: "suspended",
  rejected: "rejected",
};

const registryError = (code, message = code) =>
  Object.assign(new Error(message), { code });

const samePhone = (a, b) =>
  Boolean(a && b) && normalizePhone(a) === normalizePhone(b);

export const isSuperAdminMobile = (mobile) =>
  samePhone(mobile, SUPER_ADMIN_MOBILE);

/* ------------------------------- data + migration ------------------------------- */

// Older saves have a single `school` and no `schools`/admin status. Upgrade them
// without losing anything: the old school becomes an active entry.
export function migrateSchoolData(data) {
  const next = { ...data };
  let changed = false;

  if (!Array.isArray(next.schools)) {
    next.schools = next.school
      ? [
          {
            ...next.school,
            status: SCHOOL_STATUS.active,
            approvedAt: next.school.createdAt ?? null,
          },
        ]
      : [];
    changed = true;
  }

  const defaultSchoolId = next.schools[0]?.id ?? "school-1";
  ["teachers", "students", "classes", "courses", "admins"].forEach((key) => {
    if (!Array.isArray(next[key])) return;
    if (next[key].some((item) => !item.schoolId)) {
      next[key] = next[key].map((item) =>
        item.schoolId ? item : { ...item, schoolId: defaultSchoolId },
      );
      changed = true;
    }
  });

  if (
    Array.isArray(next.admins) &&
    next.admins.some((admin) => !admin.status)
  ) {
    next.admins = next.admins.map((admin) =>
      admin.status ? admin : { ...admin, status: "approved" },
    );
    changed = true;
  }

  return { data: next, changed };
}

export function loadSchoolData() {
  const stored = readStorage(STORAGE_KEY, null);
  const { data, changed } = migrateSchoolData(stored ?? demoSeed);
  if (!stored || changed) writeStorage(STORAGE_KEY, data);
  return data;
}

const saveSchoolData = (data) => writeStorage(STORAGE_KEY, data);

/* ------------------------------------ access ------------------------------------ */

// Why a school (and everyone in it) may not sign in; null when allowed.
export function schoolBlockReason(data, schoolId) {
  if (!schoolId) return null;
  const school = (data.schools ?? []).find((item) => item.id === schoolId);
  if (!school) return "notRegistered";
  if (school.status === SCHOOL_STATUS.pending) return "pendingApproval";
  if (school.status === SCHOOL_STATUS.rejected) return "rejected";
  if (school.status === SCHOOL_STATUS.suspended) return "schoolSuspended";
  return null;
}

export function adminBlockReason(data, admin) {
  if (admin.status === "pending") return "pendingApproval";
  if (admin.status === "rejected") return "rejected";
  if (admin.active === false) return "adminDeactivated";
  return schoolBlockReason(data, admin.schoolId);
}

/* --------------------------------- authorization --------------------------------- */

const assertSuperAdmin = () => {
  const session = readStorage(SESSION_KEY, null);
  if (session?.role !== "superadmin" || !isSuperAdminMobile(session.mobile)) {
    throw registryError("forbidden");
  }
};

/* ------------------------------------ queries ------------------------------------ */

const adminsOf = (data, schoolId) =>
  (data.admins ?? []).filter((admin) => admin.schoolId === schoolId);

export function schoolStats(data, schoolId) {
  const teachers = (data.teachers ?? []).filter((t) => t.schoolId === schoolId);
  const students = (data.students ?? []).filter((s) => s.schoolId === schoolId);
  const courses = (data.courses ?? []).filter((c) => c.schoolId === schoolId);
  const classes = (data.classes ?? []).filter((c) => c.schoolId === schoolId);
  const studentIds = new Set(students.map((s) => s.id));
  const courseIds = new Set(courses.map((c) => c.id));
  return {
    teachers: teachers.length,
    activeTeachers: teachers.filter((t) => t.active).length,
    students: students.length,
    parents: new Set(
      students.map((s) => normalizePhone(s.parentMobile ?? "")).filter(Boolean),
    ).size,
    classes: classes.length,
    courses: courses.length,
    grades: (data.grades ?? []).filter(
      (g) => courseIds.has(g.courseId) || studentIds.has(g.studentId),
    ).length,
    attendance: (data.attendance ?? []).filter(
      (a) => studentIds.has(a.studentId) || courseIds.has(a.courseId),
    ).length,
  };
}

// Counts only: the super admin sees numbers, not student records.
export function listSchoolsForSuperAdmin() {
  assertSuperAdmin();
  const data = loadSchoolData();
  return (data.schools ?? []).map((school) => ({
    ...school,
    admins: adminsOf(data, school.id).map((admin) => ({
      id: admin.id,
      name: admin.name,
      mobile: admin.mobile,
      status: admin.status ?? "approved",
      active: admin.active !== false,
      passwordResetAt: admin.passwordResetAt ?? null,
    })),
    // Names and mobiles only: the owner manages schools, so he can see who
    // teaches there (student records stay hidden).
    teachers: (data.teachers ?? [])
      .filter((teacher) => teacher.schoolId === school.id)
      .map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        mobile: teacher.mobile,
        subject: teacher.subject ?? "",
        active: teacher.active !== false,
        passwordResetAt: teacher.passwordResetAt ?? null,
      })),
    stats: schoolStats(data, school.id),
  }));
}

// Data of ONE school, for the school manager's panel.
export function scopeDataToSchool(data, schoolId) {
  const inSchool = (item) => Boolean(schoolId) && item.schoolId === schoolId;
  const students = (data.students ?? []).filter(inSchool);
  const courses = (data.courses ?? []).filter(inSchool);
  const studentIds = new Set(students.map((s) => s.id));
  const courseIds = new Set(courses.map((c) => c.id));
  return {
    ...data,
    school: (data.schools ?? []).find((s) => s.id === schoolId) ?? null,
    // A manager never needs other managers' records or any password data.
    admins: (data.admins ?? [])
      .filter(inSchool)
      .map(({ passwordHash, passwordSalt, ...rest }) => rest),
    teachers: (data.teachers ?? [])
      .filter(inSchool)
      .map(({ passwordHash, passwordSalt, ...rest }) => rest),
    students,
    classes: (data.classes ?? []).filter(inSchool),
    courses,
    grades: (data.grades ?? []).filter(
      (g) => courseIds.has(g.courseId) || studentIds.has(g.studentId),
    ),
    attendance: (data.attendance ?? []).filter(
      (a) => studentIds.has(a.studentId) || courseIds.has(a.courseId),
    ),
    enrollments: (data.enrollments ?? []).filter(
      (e) => studentIds.has(e.studentId) || courseIds.has(e.courseId),
    ),
  };
}

/* ------------------------------------ commands ------------------------------------ */

const mobileInUse = (data, mobile) =>
  isSuperAdminMobile(mobile) ||
  (data.admins ?? []).some((a) => samePhone(a.mobile, mobile)) ||
  (data.teachers ?? []).some((t) => samePhone(t.mobile, mobile));

function buildSchoolAndAdmin(data, input, { approved }) {
  const schoolName = String(input.schoolName ?? "").trim();
  const managerName = String(input.managerName ?? "").trim();
  const mobile = normalizePhone(input.mobile ?? "");
  const city = String(input.city ?? "").trim();
  if (!schoolName || !managerName) throw registryError("invalidInput");
  if (!city) throw registryError("cityRequired");
  if (!isValidIranianMobile(mobile)) throw registryError("invalidMobile");
  if (mobileInUse(data, mobile)) throw registryError("mobileTaken");

  const now = new Date().toISOString();
  const stamp = Date.now();
  const school = {
    id: `school-${stamp}`,
    name: schoolName,
    city,
    status: approved ? SCHOOL_STATUS.active : SCHOOL_STATUS.pending,
    createdAt: now,
    approvedAt: approved ? now : null,
    source: approved ? "superadmin" : "request",
  };
  const admin = {
    id: `admin-${stamp}`,
    schoolId: school.id,
    name: managerName,
    mobile,
    active: true,
    role: "admin",
    status: approved ? "approved" : "pending",
    createdAt: now,
  };
  return { school, admin };
}

// Public form: a manager asks for a school. Nothing works until approval.
export function requestSchoolRegistration(input) {
  const data = loadSchoolData();
  const { school, admin } = buildSchoolAndAdmin(data, input, {
    approved: false,
  });
  saveSchoolData({
    ...data,
    schools: [...(data.schools ?? []), school],
    admins: [...(data.admins ?? []), admin],
  });
  return { schoolId: school.id };
}

// Super admin defines a school and its manager directly (already approved).
export function createSchoolWithAdmin(input) {
  assertSuperAdmin();
  const data = loadSchoolData();
  const { school, admin } = buildSchoolAndAdmin(data, input, {
    approved: true,
  });
  saveSchoolData({
    ...data,
    schools: [...(data.schools ?? []), school],
    admins: [...(data.admins ?? []), admin],
  });
  return { schoolId: school.id };
}

const TRANSITIONS = {
  approve: { from: ["pending", "rejected"], to: SCHOOL_STATUS.active },
  reject: { from: ["pending"], to: SCHOOL_STATUS.rejected },
  suspend: { from: ["active"], to: SCHOOL_STATUS.suspended },
  reactivate: { from: ["suspended"], to: SCHOOL_STATUS.active },
};

// Changing the school's status is what blocks (or restores) its manager,
// teachers and parents: every sign-in and every open session re-checks it.
export function changeSchoolStatus(schoolId, action) {
  assertSuperAdmin();
  const rule = TRANSITIONS[action];
  const data = loadSchoolData();
  const school = (data.schools ?? []).find((item) => item.id === schoolId);
  if (!rule || !school) throw registryError("notFound");
  if (!rule.from.includes(school.status)) throw registryError("invalidState");

  const now = new Date().toISOString();
  const schools = data.schools.map((item) =>
    item.id === schoolId
      ? {
          ...item,
          status: rule.to,
          ...(action === "approve" ? { approvedAt: now } : {}),
          ...(action === "suspend" ? { suspendedAt: now } : {}),
          ...(action === "reactivate" ? { suspendedAt: null } : {}),
        }
      : item,
  );
  const approvalStatus =
    action === "approve" ? "approved" : action === "reject" ? "rejected" : null;
  const admins = approvalStatus
    ? (data.admins ?? []).map((admin) =>
        admin.schoolId === schoolId && admin.status !== approvalStatus
          ? { ...admin, status: approvalStatus }
          : admin,
      )
    : data.admins;
  saveSchoolData({ ...data, schools, admins });
}

/* ----------------------------- manager password ----------------------------- */

// FRONTEND-ONLY: a salted hash in localStorage is still readable by anyone who
// can open this browser's storage. With a backend, hash and verify on the server.
const hashText = async (text) => {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Insecure contexts (plain http on a LAN address) have no crypto.subtle.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return `weak-${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
};

const randomSalt = () =>
  Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join("");

// Readable temporary password without look-alike characters (0/O, 1/l/I).
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateTemporaryPassword(length = 10) {
  const values = new Uint32Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else values.forEach((_, i) => (values[i] = Math.floor(Math.random() * 2 ** 32)));
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join("");
}

export const MIN_PASSWORD_LENGTH = 6;

// Works for managers and teachers: both keep passwordHash/passwordSalt.
export async function verifyUserPassword(user, password) {
  if (!user?.passwordHash) return false;
  const hash = await hashText(`${user.passwordSalt}:${String(password ?? "")}`);
  return hash === user.passwordHash;
}
export const verifyAdminPassword = verifyUserPassword;

// `listKey` is "admins" or "teachers"; returns that list with the new password.
async function storePassword(data, listKey, userId, password, { mustChange }) {
  const salt = randomSalt();
  const passwordHash = await hashText(`${salt}:${password}`);
  return (data[listKey] ?? []).map((admin) =>
    admin.id === userId
      ? {
          ...admin,
          passwordSalt: salt,
          passwordHash,
          mustChangePassword: mustChange,
          ...(mustChange
            ? {
                passwordResetAt: new Date().toISOString(),
                // Bumping the epoch closes every session the manager has open.
                sessionEpoch: (admin.sessionEpoch ?? 0) + 1,
              }
            : { passwordChangedAt: new Date().toISOString() }),
        }
      : admin,
  );
}

// The owner resets a manager's or teacher's password. Returns the new
// temporary password so the owner can pass it on; the person must replace it
// after signing in.
async function resetPassword(listKey, userId) {
  assertSuperAdmin();
  const data = loadSchoolData();
  if (!(data[listKey] ?? []).some((user) => user.id === userId)) {
    throw registryError("notFound");
  }
  const temporaryPassword = generateTemporaryPassword();
  const list = await storePassword(data, listKey, userId, temporaryPassword, {
    mustChange: true,
  });
  saveSchoolData({ ...data, [listKey]: list });
  return { temporaryPassword };
}
export const resetAdminPassword = (adminId) => resetPassword("admins", adminId);
export const resetTeacherPassword = (teacherId) =>
  resetPassword("teachers", teacherId);

// A signed-in manager or teacher sets their own password (clears the
// "must change" flag).
export async function changeOwnPassword(newPassword) {
  const session = readStorage(SESSION_KEY, null);
  const listKey = { admin: "admins", teacher: "teachers" }[session?.role];
  if (!listKey) throw registryError("forbidden");
  const password = String(newPassword ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) throw registryError("weakPassword");
  const data = loadSchoolData();
  if (!(data[listKey] ?? []).some((user) => user.id === session.userId)) {
    throw registryError("notFound");
  }
  const list = await storePassword(data, listKey, session.userId, password, {
    mustChange: false,
  });
  saveSchoolData({ ...data, [listKey]: list });
}
export const changeOwnAdminPassword = changeOwnPassword;

export { SUPER_ADMIN_ID };
