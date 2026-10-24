import { readStorage, writeStorage, subscribeToStorage } from "./storage";

const STORAGE_KEY = "appData";

const getData = () => readStorage(STORAGE_KEY, { attendance: [] });
const setData = (nextData) => writeStorage(STORAGE_KEY, nextData);

export const listAttendanceForCourse = async (courseId) => {
  const data = getData();
  return (data.attendance || []).filter((entry) => entry.courseId === courseId);
};

export const listStudentAttendanceForCourse = async (studentId, courseId) => {
  const data = getData();
  return (data.attendance || []).filter(
    (entry) => entry.studentId === studentId && entry.courseId === courseId,
  );
};

export const saveAttendance = async ({ courseId, studentId, date, status }) => {
  const data = getData();
  const record = {
    id: `att-${Date.now()}`,
    courseId,
    studentId,
    date,
    status,
  };

  const nextEntries = [...(data.attendance || []), record];
  setData({ ...data, attendance: nextEntries });
  return record;
};

export const subscribeAttendance = (callback) => subscribeToStorage(callback);
