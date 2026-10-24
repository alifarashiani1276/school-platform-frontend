import assert from "node:assert/strict";
import { buildTeacherAdminStats } from "./adminTeacherStats.js";

const teacher = { id: "teacher-1", name: "Reza Ahmadi" };
const classes = [{ id: "class-1", name: "Grade 7-A" }];
const courses = [
  {
    id: "course-1",
    teacherId: "teacher-1",
    classId: "class-1",
    name: "Mathematics",
  },
  {
    id: "course-2",
    teacherId: "teacher-2",
    classId: "class-1",
    name: "Science",
  },
];
const attendance = [
  { courseId: "course-1", studentId: "student-1", status: "present" },
  { courseId: "course-1", studentId: "student-2", status: "absent" },
  { courseId: "course-1", studentId: "student-3", status: "late" },
];
const grades = [
  { courseId: "course-1", studentId: "student-1", score: 18, max: 20 },
  { courseId: "course-1", studentId: "student-2", score: 12, max: 20 },
];

const result = buildTeacherAdminStats({
  teacher,
  classes,
  courses,
  attendance,
  grades,
});
assert.equal(result.classSummaries.length, 1);
assert.equal(result.classSummaries[0].present, 2);
assert.equal(result.classSummaries[0].absent, 1);
assert.equal(result.lessonSummaries.length, 1);
assert.ok(result.lessonSummaries[0].average >= 0);
console.log("teacher stats checks passed");
