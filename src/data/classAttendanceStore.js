import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "../services/storage";

// Whole-class attendance (all students of a class), kept separate from the
// per-lesson attendance. Shape: { [classId]: { [YYYY-MM-DD]: { [studentId]: status } } }
const STORAGE_KEY = "classAttendance";

let state = readStorage(STORAGE_KEY, null);
if (!state || typeof state !== "object" || Array.isArray(state)) state = {};

const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function useClassAttendance() {
  const all = useSyncExternalStore(subscribe, getSnapshot);

  return {
    all,
    getDay: (classId, date) => all[classId]?.[date] ?? null,
    saveDay: (classId, date, records) => {
      state = { ...state, [classId]: { ...(state[classId] ?? {}), [date]: records } };
      writeStorage(STORAGE_KEY, state);
      listeners.forEach((listener) => listener());
    },
  };
}
