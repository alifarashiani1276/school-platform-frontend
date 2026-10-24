import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "../services/storage";

// Frontend-only store for parent <-> teacher messages. One message belongs to
// ONE class + ONE student (the same ids the teacher panel uses) and carries the
// mobile number of the parent it was exchanged with, so a parent can only ever
// be handed the messages of their own conversation.
// Shape: { id, classId, studentId, parentMobile, sender: "parent"|"teacher", text, createdAt }
const STORAGE_KEY = "parentMessages";
export const MAX_MESSAGE_LENGTH = 1000;

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
const newId = () => `m${Date.now()}${counter++}`;

export function useParentMessages() {
  const messages = useSyncExternalStore(subscribe, getSnapshot);

  return {
    messages,
    // Teacher view: the whole conversation of one student of one class.
    forStudent: (classId, studentId) =>
      messages.filter((m) => m.classId === classId && m.studentId === studentId),
    // Returns false when the text is empty (nothing is stored).
    send: ({ classId, studentId, parentMobile, sender, text }) => {
      const clean = String(text ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!clean || !classId || !studentId || !parentMobile) return false;
      commit([
        ...state,
        {
          id: newId(),
          classId,
          studentId,
          parentMobile,
          sender,
          text: clean,
          createdAt: new Date().toISOString(),
        },
      ]);
      return true;
    },
  };
}
