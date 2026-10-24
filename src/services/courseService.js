import { readStorage, writeStorage, subscribeToStorage } from "./storage";

const STORAGE_KEY = "appData";

const getData = () => readStorage(STORAGE_KEY, { courses: [] });
const setData = (nextData) => writeStorage(STORAGE_KEY, nextData);

export const listCoursesForSchool = async (schoolId) => {
  const data = getData();
  return (data.courses || []).filter((course) => course.schoolId === schoolId);
};

export const listCoursesForTeacher = async (teacherId) => {
  const data = getData();
  return (data.courses || []).filter(
    (course) => course.teacherId === teacherId,
  );
};

export const createCourse = async (payload) => {
  const data = getData();
  const course = {
    id: `course-${Date.now()}`,
    schoolId: payload.schoolId,
    teacherId: payload.teacherId,
    classId: payload.classId,
    name: payload.name,
  };

  const nextData = { ...data, courses: [...(data.courses || []), course] };
  setData(nextData);
  return course;
};

export const getCourseById = async (courseId) => {
  const data = getData();
  return (data.courses || []).find((course) => course.id === courseId) || null;
};

export const subscribeCourses = (callback) => subscribeToStorage(callback);
