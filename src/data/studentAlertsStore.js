import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "../services/storage";

const STORAGE_KEY = "studentAlerts";

let state = readStorage(STORAGE_KEY, []);
if (!Array.isArray(state)) state = [];

const listeners = new Set();

const commit = (next) => {
  state = next;
  writeStorage(STORAGE_KEY, state);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

let counter = 0;
const newId = () => `alert-${Date.now()}-${counter++}`;

export function useStudentAlerts() {
  const alerts = useSyncExternalStore(subscribe, getSnapshot);

  return {
    alerts,
    forStudent: (classId, studentId) =>
      alerts.filter(
        (alert) => alert.classId === classId && alert.studentId === studentId,
      ),
    send: ({ classId, studentId, parentMobile, text }) => {
      const clean = String(text ?? "").trim();
      if (!clean || !classId || !studentId) return false;

      commit([
        {
          id: newId(),
          classId,
          studentId,
          parentMobile: parentMobile ?? null,
          sender: "teacher",
          text: clean,
          createdAt: new Date().toISOString(),
        },
        ...state,
      ]);
      return true;
    },
  };
}
