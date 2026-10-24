import { useSyncExternalStore } from "react";
import { deleteFile } from "../services/fileStore";
import { readStorage, writeStorage } from "../services/storage";

// Frontend-only store for the shared question bank.
// A "set" is a group of sample questions that ONE teacher published for ONE
// subject (درس) under their own name:
//   { id, subject, title, authorId, authorName, createdAt,
//     questions: [{ id, type: "mcq" | "descriptive", text, options, correct, answer }],
//     comments:  [{ id, authorId, authorName, text, createdAt }] }
// Every teacher sees the sets of every other teacher and can comment on them.
// Persisted through the project's existing localStorage helper.
// Newer fields (older saved sets simply do not have them):
//   kind: "typed" | "file"  (missing = "typed")
//   hasAnswers: boolean     (false = exam sheet only, no answer key; missing = true)
//   file: { name, size }    (kind "file": the PDF itself is in IndexedDB under the set id)
const STORAGE_KEY = "questionBank";

const mcq = (id, text, options, correct) => ({ id, type: "mcq", text, options, correct, answer: "" });
const written = (id, text, answer = "") => ({ id, type: "descriptive", text, options: [], correct: 0, answer });

const seed = [
  {
    id: "qb-seed-1",
    subject: "Mathematics",
    title: "Fractions — quick check",
    authorId: "teacher-2",
    authorName: "Sara Karimi",
    createdAt: "2026-09-20T09:00:00.000Z",
    questions: [
      mcq("q1", "What is 1/2 + 1/4?", ["1/6", "2/6", "3/4", "1/8"], 2),
      mcq("q2", "Which fraction is the largest?", ["1/3", "1/2", "1/4", "1/8"], 1),
      written("q3", "Explain how to add two fractions with different denominators.", "Find a common denominator, convert both fractions, then add the numerators."),
    ],
    comments: [
      {
        id: "qc-seed-1",
        authorId: "teacher-3",
        authorName: "Maryam Hosseini",
        text: "Clear and short. I would add one word problem for the harder group.",
        createdAt: "2026-09-22T11:30:00.000Z",
      },
    ],
  },
  {
    id: "qb-seed-2",
    subject: "Mathematics",
    title: "Multiplication tables practice",
    authorId: "teacher-3",
    authorName: "Maryam Hosseini",
    createdAt: "2026-09-28T08:15:00.000Z",
    questions: [
      mcq("q1", "7 × 8 = ?", ["54", "56", "63", "48"], 1),
      mcq("q2", "9 × 6 = ?", ["54", "56", "45", "63"], 0),
    ],
    comments: [],
  },
  {
    id: "qb-seed-3",
    subject: "Science",
    title: "Plants and photosynthesis",
    authorId: "teacher-1",
    authorName: "Reza Ahmadi",
    createdAt: "2026-10-02T10:00:00.000Z",
    questions: [
      mcq("q1", "Which gas do plants take in for photosynthesis?", ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], 1),
      mcq("q2", "Where does photosynthesis mainly happen?", ["Roots", "Stem", "Leaves", "Seeds"], 2),
      written("q3", "Why do plants need sunlight?", "Sunlight gives the energy plants use to make their own food."),
    ],
    comments: [
      {
        id: "qc-seed-2",
        authorId: "teacher-2",
        authorName: "Sara Karimi",
        text: "Good set. Question 3 works well as a class discussion starter too.",
        createdAt: "2026-10-04T13:45:00.000Z",
      },
    ],
  },
  {
    id: "qb-seed-4",
    subject: "English",
    title: "Past tense — verbs",
    authorId: "teacher-1",
    authorName: "Reza Ahmadi",
    createdAt: "2026-10-06T07:40:00.000Z",
    questions: [
      mcq("q1", "Choose the past tense of “go”.", ["goed", "went", "gone", "going"], 1),
      written("q2", "Write two sentences about yesterday using the past tense."),
    ],
    comments: [],
  },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

let state = readStorage(STORAGE_KEY, null);
if (!Array.isArray(state)) state = clone(seed);

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
const newId = (prefix) => `${prefix}${Date.now()}${counter++}`;

export const subjectKey = (value) => String(value ?? "").trim().toLowerCase();
export const makeSetId = () => newId("qb");
export const isFileSet = (set) => set.kind === "file";
export const setHasAnswers = (set) => set.hasAnswers !== false;

export function useQuestionBank() {
  const sets = useSyncExternalStore(subscribe, getSnapshot);

  return {
    sets,
    addSet: ({ id, kind = "typed", subject, title, questions = [], hasAnswers = true, file = null, authorId, authorName }) =>
      commit([
        {
          id: id ?? makeSetId(),
          kind,
          subject: subject.trim(),
          title: title.trim(),
          authorId,
          authorName,
          createdAt: new Date().toISOString(),
          hasAnswers,
          file,
          questions: questions.map((q, i) => ({ ...q, id: `q${i + 1}` })),
          comments: [],
        },
        ...state,
      ]),
    deleteSet: (id) => {
      deleteFile(id);
      commit(state.filter((s) => s.id !== id));
    },
    addComment: (setId, { text, authorId, authorName }) =>
      commit(
        state.map((s) =>
          s.id === setId
            ? {
                ...s,
                comments: [
                  ...s.comments,
                  { id: newId("qc"), authorId, authorName, text: text.trim(), createdAt: new Date().toISOString() },
                ],
              }
            : s,
        ),
      ),
    deleteComment: (setId, commentId) =>
      commit(
        state.map((s) =>
          s.id === setId ? { ...s, comments: s.comments.filter((c) => c.id !== commentId) } : s,
        ),
      ),
  };
}
