import { readStorage, writeStorage, subscribeToStorage } from "./storage";

const STORAGE_KEY = "appData";

const getData = () => readStorage(STORAGE_KEY, { grades: [] });
const setData = (nextData) => writeStorage(STORAGE_KEY, nextData);

export const listGradesForCourse = async (courseId) => {
  const data = getData();
  return (data.grades || []).filter((grade) => grade.courseId === courseId);
};

export const listGradesForStudent = async (studentId) => {
  const data = getData();
  return (data.grades || []).filter((grade) => grade.studentId === studentId);
};

export const listStudentGradesForCourse = async (studentId, courseId) => {
  const data = getData();
  return (data.grades || []).filter(
    (grade) => grade.studentId === studentId && grade.courseId === courseId,
  );
};

export const createGrade = async (payload) => {
  const data = getData();
  const grade = {
    id: `grade-${Date.now()}`,
    courseId: payload.courseId,
    studentId: payload.studentId,
    title: payload.title || "Assessment",
    score: Number(payload.score || 0),
    max: Number(payload.max || 20),
    date: payload.date,
    note: payload.note || "",
  };

  const nextData = { ...data, grades: [...(data.grades || []), grade] };
  setData(nextData);
  return grade;
};

export const updateGrade = async (gradeId, updates) => {
  const data = getData();
  const nextGrades = (data.grades || []).map((grade) =>
    grade.id === gradeId ? { ...grade, ...updates } : grade,
  );
  setData({ ...data, grades: nextGrades });
  return nextGrades.find((grade) => grade.id === gradeId) || null;
};

export const deleteGrade = async (gradeId) => {
  const data = getData();
  const nextGrades = (data.grades || []).filter(
    (grade) => grade.id !== gradeId,
  );
  setData({ ...data, grades: nextGrades });
};

export const subscribeGrades = (callback) => subscribeToStorage(callback);
