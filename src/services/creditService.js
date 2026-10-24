import { readStorage, writeStorage } from "./storage";

const STORAGE_KEY = "appData";

const getData = () =>
  readStorage(STORAGE_KEY, { teachers: [], creditLogs: [] });
const setData = (nextData) => writeStorage(STORAGE_KEY, nextData);

export const getTeacherCredit = async (teacherId) => {
  const data = getData();
  const teacher = (data.teachers || []).find((item) => item.id === teacherId);
  return teacher ? Number(teacher.credit || 0) : 0;
};

export const chargeTeacher = async ({ teacherId, amount, adminId, note }) => {
  const data = getData();
  const nextTeachers = (data.teachers || []).map((teacher) => {
    if (teacher.id !== teacherId) return teacher;
    const balance = Number(teacher.credit || 0) + Number(amount || 0);
    return { ...teacher, credit: balance };
  });

  const log = {
    id: `credit-${Date.now()}`,
    teacherId,
    amount: Number(amount || 0),
    date: new Date().toISOString().slice(0, 10),
    adminId,
    note: note || "Manual book credit",
  };

  const nextData = {
    ...data,
    teachers: nextTeachers,
    creditLogs: [...(data.creditLogs || []), log],
  };
  setData(nextData);
  return log;
};

export const listCreditLogs = async (teacherId) => {
  const data = getData();
  return (data.creditLogs || []).filter((log) => log.teacherId === teacherId);
};
