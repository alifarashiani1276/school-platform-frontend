import { normalizePhone } from "../utils/jalali";
import { readStorage, writeStorage, subscribeToStorage } from "./storage";

const STORAGE_KEY = "appData";

const getData = () =>
  readStorage(STORAGE_KEY, { students: [], enrollments: [], courses: [] });
const setData = (nextData) => writeStorage(STORAGE_KEY, nextData);

export const listStudentsForSchool = async (schoolId) => {
  const data = getData();
  return (data.students || []).filter(
    (student) => student.schoolId === schoolId,
  );
};

export const getStudentsForParent = async (parentMobile) => {
  const data = getData();
  const normalized = normalizePhone(parentMobile);
  return (data.students || []).filter(
    (student) => normalizePhone(student.parentMobile) === normalized,
  );
};

export const getStudentById = async (studentId) => {
  const data = getData();
  return (
    (data.students || []).find((student) => student.id === studentId) || null
  );
};

export const createStudent = async (payload) => {
  const data = getData();
  const student = {
    id: `student-${Date.now()}`,
    schoolId: payload.schoolId,
    name: payload.name,
    classId: payload.classId,
    parentMobile: normalizePhone(payload.parentMobile),
  };

  const nextData = { ...data, students: [...(data.students || []), student] };
  setData(nextData);
  return student;
};

export const updateStudent = async (studentId, updates) => {
  const data = getData();
  const nextStudents = (data.students || []).map((student) =>
    student.id === studentId ? { ...student, ...updates } : student,
  );
  setData({ ...data, students: nextStudents });
  return nextStudents.find((student) => student.id === studentId) || null;
};

export const assignStudentToCourse = async (studentId, courseId) => {
  const data = getData();
  const exists = (data.enrollments || []).some(
    (item) => item.studentId === studentId && item.courseId === courseId,
  );

  if (exists) {
    return true;
  }

  const nextData = {
    ...data,
    enrollments: [
      ...(data.enrollments || []),
      { id: `enr-${Date.now()}`, studentId, courseId },
    ],
  };
  setData(nextData);
  return true;
};

export const listEnrollmentsForStudent = async (studentId) => {
  const data = getData();
  return (data.enrollments || []).filter(
    (item) => item.studentId === studentId,
  );
};

export const getStudentsForTeacher = async (teacherId) => {
  const data = getData();
  const courses = (data.courses || []).filter(
    (course) => course.teacherId === teacherId,
  );
  const courseIds = courses.map((course) => course.id);
  const enrollments = (data.enrollments || []).filter((item) =>
    courseIds.includes(item.courseId),
  );
  const studentIds = [...new Set(enrollments.map((entry) => entry.studentId))];

  return (data.students || []).filter((student) =>
    studentIds.includes(student.id),
  );
};

export const subscribeStudents = (callback) => subscribeToStorage(callback);
