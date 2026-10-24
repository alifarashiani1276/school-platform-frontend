import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "../services/storage";

// Frontend-only store for the Porsline online exam of each school class.
// One entry per class id:
//   { link, title, target, live, openedAt }
// `live` + `link` are exactly what a student panel needs later: when `live` is
// true the students of that class (or of the selected lessons) see an
// "Enter exam" button that opens `link`.
// `target` is "all" (whole class) or an array of lesson ids.
const STORAGE_KEY = "onlineExams";

let state = readStorage(STORAGE_KEY, null);
if (!state || typeof state !== "object" || Array.isArray(state)) state = {};

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

// Only plain http(s) links are accepted (blocks javascript:, data:, etc.).
export const normalizeExamLink = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
};

export function useOnlineExams() {
  const all = useSyncExternalStore(subscribe, getSnapshot);

  return {
    all,
    getOnlineExam: (classId) => all[classId] ?? null,
    saveOnlineExam: (classId, changes) =>
      commit({ ...state, [classId]: { ...(state[classId] ?? {}), ...changes } }),
    clearOnlineExam: (classId) => {
      const { [classId]: _removed, ...rest } = state;
      commit(rest);
    },
  };
}
