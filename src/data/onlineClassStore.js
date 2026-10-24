import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "../services/storage";

// Frontend-only store for the Skyroom virtual class of each school class.
// One entry per class id:
//   { link, title, target, live, openedAt, recipients }
// `live` + `link` are exactly what a student panel needs later: when `live` is
// true the students of that class see a "Join class" button that opens `link`.
// `target` is "all" (whole class) or a lesson id (only that lesson's students).
const STORAGE_KEY = "onlineClasses";

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
export const normalizeRoomLink = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
};

export function useOnlineClasses() {
  const all = useSyncExternalStore(subscribe, getSnapshot);

  return {
    all,
    getOnlineClass: (classId) => all[classId] ?? null,
    saveOnlineClass: (classId, changes) =>
      commit({ ...state, [classId]: { ...(state[classId] ?? {}), ...changes } }),
    clearOnlineClass: (classId) => {
      const { [classId]: _removed, ...rest } = state;
      commit(rest);
    },
  };
}
