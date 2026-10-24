import { normalizePhone } from "../utils/jalali";
import { readStorage, writeStorage, subscribeToStorage } from "./storage";

const STORAGE_KEY = "appData";

const getData = () => readStorage(STORAGE_KEY, { teachers: [], courses: [] });
const setData = (nextData) => writeStorage(STORAGE_KEY, nextData);

export const listTeachersForSchool = async (schoolId) => {
  const data = getData();
  return (data.teachers || []).filter(
    (teacher) => teacher.schoolId === schoolId,
  );
};

export const getTeacherById = async (teacherId) => {
  const data = getData();
  return (
    (data.teachers || []).find((teacher) => teacher.id === teacherId) || null
  );
};

export const createTeacher = async (payload) => {
  const data = getData();
  const normalized = normalizePhone(payload.mobile);
  const exists = (data.teachers || []).some(
    (teacher) =>
      normalizePhone(teacher.mobile) === normalized &&
      teacher.schoolId === payload.schoolId,
  );

  if (exists) {
    throw new Error(
      "A teacher with this mobile number already exists in this school",
    );
  }

  const teacher = {
    id: `teacher-${Date.now()}`,
    schoolId: payload.schoolId,
    name: payload.name,
    mobile: normalized,
    subject: payload.subject || "General",
    active: payload.active !== false,
    credit: Number(payload.credit || 0),
    subscriptionUntil: payload.subscriptionUntil || "2099-12-31",
    createdByAdminId: payload.createdByAdminId,
  };

  const nextData = { ...data, teachers: [...(data.teachers || []), teacher] };
  setData(nextData);
  return teacher;
};

export const updateTeacher = async (teacherId, updates) => {
  const data = getData();
  const nextTeachers = (data.teachers || []).map((teacher) =>
    teacher.id === teacherId ? { ...teacher, ...updates } : teacher,
  );

  setData({ ...data, teachers: nextTeachers });
  return nextTeachers.find((teacher) => teacher.id === teacherId) || null;
};

export const deactivateTeacher = async (teacherId) =>
  updateTeacher(teacherId, { active: false });

export const subscribeTeachers = (callback) => subscribeToStorage(callback);
