import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "../services/storage";
import { mockClasses } from "./mockTeacherData";

// One shared, frontend-only source of truth for the teacher's classes so the
// dashboard, sidebar and every class sub-page always agree. Persisted through
// the project's existing localStorage helper.
const STORAGE_KEY = "teacherClasses";

const clone = (value) => JSON.parse(JSON.stringify(value));

let state = readStorage(STORAGE_KEY, null);
if (!Array.isArray(state) || state.length === 0) {
  state = clone(mockClasses);
}

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

export const getStudentCount = (cls) => cls?.students?.length ?? 0;

export function useTeacherClasses() {
  const classes = useSyncExternalStore(subscribe, getSnapshot);

  return {
    classes,
    activeClasses: classes.filter((cls) => !cls.archived),
    archivedClasses: classes.filter((cls) => cls.archived),
    getClass: (id) => classes.find((cls) => cls.id === id) ?? null,
    addClass: (data) => {
      const created = {
        grade: "",
        subject: "",
        description: "",
        schoolName: "",
        emoji: "🌟",
        color: "bg-purple-100",
        schoolYear: "",
        ...data,
        id: `c${Date.now()}`,
        archived: false,
        students: [],
        lessons: [],
      };
      commit([...state, created]);
      return created;
    },
    // `changes` is an object, or a function receiving the current class.
    updateClass: (id, changes) =>
      commit(
        state.map((cls) =>
          cls.id === id
            ? { ...cls, ...(typeof changes === "function" ? changes(cls) : changes) }
            : cls,
        ),
      ),
    archiveClass: (id) =>
      commit(state.map((cls) => (cls.id === id ? { ...cls, archived: true } : cls))),
    restoreClass: (id) =>
      commit(state.map((cls) => (cls.id === id ? { ...cls, archived: false } : cls))),
  };
}
