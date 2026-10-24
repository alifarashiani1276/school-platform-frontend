import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "../services/storage";

// Frontend-only store for homework. Every assignment belongs to ONE class and
// ONE lesson of that class, because the students of different lessons can differ.
// Persisted through the project's existing localStorage helper.
const STORAGE_KEY = "teacherAssignments";

let state = readStorage(STORAGE_KEY, null);
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
const newId = () => `a${Date.now()}${counter++}`;

export function useAssignments() {
  const assignments = useSyncExternalStore(subscribe, getSnapshot);

  return {
    assignments,
    forClass: (classId) => assignments.filter((a) => a.classId === classId),
    // One assignment is created for each selected lesson.
    addAssignments: ({ classId, lessonIds, title, description, dueDate }) =>
      commit([
        ...state,
        ...lessonIds.map((lessonId) => ({
          id: newId(),
          classId,
          lessonId,
          title,
          description,
          dueDate,
          createdAt: new Date().toISOString(),
        })),
      ]),
    updateAssignment: (id, changes) =>
      commit(state.map((a) => (a.id === id ? { ...a, ...changes } : a))),
    deleteAssignment: (id) => commit(state.filter((a) => a.id !== id)),
  };
}
