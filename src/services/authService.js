import { SUPER_ADMIN_ID } from "../config/superAdmin";
import { demoSeed, DEMO_ADMIN_MOBILE } from "../data/demoSeed";
import { mockClasses } from "../data/mockTeacherData";
import { normalizePhone, isValidIranianMobile } from "../utils/jalali";
import {
  adminBlockReason,
  isSuperAdminMobile,
  loadSchoolData,
  schoolBlockReason,
  verifyUserPassword,
} from "./schoolRegistry";
import { readStorage, writeStorage } from "./storage";

const STORAGE_KEY = "appData";
const SESSION_KEY = "session";
const DEMO_OTP = "123456";

// Errors carry a `code` so the UI can show them in the active language.
const authError = (code, message) => Object.assign(new Error(message), { code });

const getSchoolData = () => loadSchoolData();

// Never copy a password hash into the saved session.
const withoutSecrets = ({ passwordHash, passwordSalt, ...rest }) => rest;

export const ensureDemoSeed = async () => {
  if (!readStorage(STORAGE_KEY, null)) {
    writeStorage(STORAGE_KEY, demoSeed);
  }
  return getSchoolData();
};

// Students that a teacher added to a class with an optional parent mobile live
// in the teacher panel store, not in `appData`. A parent whose children exist
// only there must be able to sign in too (same rules as the parent data layer:
// archived and example classes are ignored).
const hasTeacherPanelChild = (normalized) => {
  const stored = readStorage("teacherClasses", null);
  const classes = Array.isArray(stored) && stored.length ? stored : mockClasses;
  return classes.some(
    (cls) =>
      !cls.archived &&
      !cls.isExample &&
      (cls.students ?? []).some(
        (student) =>
          Boolean(student.parentMobile) &&
          normalizePhone(student.parentMobile) === normalized,
      ),
  );
};

// Parent children that live in the school records, minus schools that are not
// active (their parents are locked out together with the school).
const parentSchoolStudents = (data, normalized) =>
  (data.students || []).filter(
    (student) =>
      student.parentMobile && normalizePhone(student.parentMobile) === normalized,
  );

export const resolveRole = async (mobile) => {
  await ensureDemoSeed();
  const normalized = normalizePhone(mobile);
  const data = getSchoolData();

  if (isSuperAdminMobile(normalized)) {
    return {
      role: "superadmin",
      user: {
        id: SUPER_ADMIN_ID,
        name: "Super Admin",
        mobile: normalized,
        schoolId: null,
      },
    };
  }

  const admin = (data.admins || []).find(
    (item) => normalizePhone(item.mobile) === normalized,
  );
  if (admin) {
    const blocked = adminBlockReason(data, admin);
    if (blocked) throw authError(blocked, blocked);
    return { role: "admin", user: admin };
  }

  const teacher = (data.teachers || []).find(
    (item) => normalizePhone(item.mobile) === normalized,
  );
  if (teacher) {
    if (!teacher.active) {
      throw authError(
        "deactivated",
        "Your account has been deactivated by the school administrator",
      );
    }
    if (!teacher.createdByAdminId) {
      throw authError(
        "notCreated",
        "Your account has not been created by a school administrator",
      );
    }
    const blocked = schoolBlockReason(data, teacher.schoolId);
    if (blocked) throw authError(blocked, blocked);
    return { role: "teacher", user: teacher };
  }

  const parentStudents = parentSchoolStudents(data, normalized);
  const openStudents = parentStudents.filter(
    (student) => !schoolBlockReason(data, student.schoolId),
  );
  if (openStudents.length > 0 || hasTeacherPanelChild(normalized)) {
    return {
      role: "parent",
      user: { mobile: normalized, studentIds: openStudents.map((i) => i.id) },
    };
  }
  if (parentStudents.length > 0) {
    // Every child of this parent belongs to a school that is not active.
    const reason = schoolBlockReason(data, parentStudents[0].schoolId);
    throw authError(reason, reason);
  }

  return null;
};

// A saved session is re-checked on every read, so suspending a school signs out
// its manager, teachers and parents without waiting for them to log in again.
const sessionStillAllowed = (session, data) => {
  if (session.role === "superadmin") return isSuperAdminMobile(session.mobile);
  if (session.role === "admin") {
    const admin = (data.admins || []).find((item) => item.id === session.userId);
    return (
      Boolean(admin) &&
      !adminBlockReason(data, admin) &&
      // A password reset by the owner closes sessions opened before it.
      (session.epoch ?? 0) === (admin.sessionEpoch ?? 0)
    );
  }
  if (session.role === "teacher") {
    const teacher = (data.teachers || []).find(
      (item) => item.id === session.userId,
    );
    return (
      Boolean(teacher) &&
      teacher.active &&
      !schoolBlockReason(data, teacher.schoolId) &&
      // A password reset by the owner closes sessions opened before it.
      (session.epoch ?? 0) === (teacher.sessionEpoch ?? 0)
    );
  }
  if (session.role === "parent") {
    const normalized = normalizePhone(session.mobile ?? "");
    const mine = parentSchoolStudents(data, normalized);
    if (mine.length === 0) return hasTeacherPanelChild(normalized);
    return (
      mine.some((student) => !schoolBlockReason(data, student.schoolId)) ||
      hasTeacherPanelChild(normalized)
    );
  }
  return false;
};

export const getSession = async () => {
  const session = readStorage(SESSION_KEY, null);
  if (!session) return null;
  return sessionStillAllowed(session, getSchoolData()) ? session : null;
};

export const setSession = async (session) => {
  writeStorage(SESSION_KEY, session);
  return session;
};

export const login = async ({ mobile, otp }) => {
  await ensureDemoSeed();
  const normalized = normalizePhone(mobile);

  if (!isValidIranianMobile(normalized)) {
    throw authError("invalidMobile", "Please enter a valid Iranian mobile number (09xxxxxxxxx)");
  }

  const resolved = await resolveRole(normalized);

  // A manager or teacher whose password was reset signs in with that password;
  // everyone else (and people without one) uses the demo code.
  const needsPassword =
    (resolved?.role === "admin" || resolved?.role === "teacher") &&
    Boolean(resolved.user.passwordHash);
  if (needsPassword) {
    if (!(await verifyUserPassword(resolved.user, otp))) {
      throw authError("invalidPassword", "Wrong password");
    }
  } else if (String(otp).trim() !== DEMO_OTP) {
    throw authError("invalidOtp", "Demo OTP is 123456");
  }

  if (!resolved) {
    throw authError("notRegistered", "This mobile number is not registered in the system");
  }

  const session = {
    role: resolved.role,
    schoolId:
      resolved.role === "superadmin"
        ? null
        : resolved.user.schoolId || "school-1",
    userId: resolved.user.id || resolved.user.mobile,
    epoch:
      resolved.role === "admin" || resolved.role === "teacher"
        ? (resolved.user.sessionEpoch ?? 0)
        : 0,
    user: withoutSecrets(resolved.user),
    mobile: normalized,
    createdAt: new Date().toISOString(),
  };

  await setSession(session);
  return session;
};

export const logout = async () => {
  localStorage.removeItem("school:session");
  window.dispatchEvent(new Event("school:storage"));
};

export const isDemoOtpVisible = () => true;

export const getDemoOtpHint = () => `Demo code: ${DEMO_OTP}`;

export const getCurrentUserContext = async () => {
  const session = await getSession();
  if (!session) return null;
  const data = getSchoolData();

  if (session.role === "admin") {
    return (data.admins || []).find((item) => item.id === session.userId) || null;
  }
  if (session.role === "teacher") {
    return (data.teachers || []).find((item) => item.id === session.userId) || null;
  }
  if (session.role === "parent") {
    return {
      mobile: session.mobile,
      studentIds: session.user?.studentIds || [],
    };
  }

  return null;
};

export const isTeacherLocked = (teacher) => {
  if (!teacher) return true;
  if (!teacher.active) return true;
  if (Number(teacher.credit || 0) <= 0) return true;
  if (
    teacher.subscriptionUntil &&
    new Date(teacher.subscriptionUntil) < new Date()
  )
    return true;
  return false;
};

export const isAdminSeatForSchool = (mobile) =>
  normalizePhone(mobile) === normalizePhone(DEMO_ADMIN_MOBILE);
