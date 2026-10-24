import { GRADE_SCALE } from "../config/gradeScale";
import { listGradesForStudent } from "./gradeService";
import { listAttendanceForCourse } from "./attendanceService";
import { listCoursesForSchool } from "./courseService";
import { listEnrollmentsForStudent } from "./studentService";

const toDateValue = (value) => (value ? new Date(value).getTime() : 0);

const inRange = (date, fromDate, toDate) => {
  const time = toDateValue(date);
  const start = toDateValue(fromDate);
  const end = toDateValue(toDate);
  return time >= start && time <= end;
};

const gradeAverageInScale = (grades) => {
  if (!grades || grades.length === 0) return null;
  const averageRatio =
    grades.reduce(
      (sum, grade) => sum + grade.score / Math.max(grade.max, 1),
      0,
    ) / grades.length;
  return Math.min(
    GRADE_SCALE.max,
    Math.max(GRADE_SCALE.min, averageRatio * GRADE_SCALE.max),
  );
};

export const buildCourseReport = async ({
  studentId,
  courseId,
  fromDate,
  toDate,
}) => {
  const grades = (await listGradesForStudent(studentId)).filter(
    (grade) =>
      grade.courseId === courseId && inRange(grade.date, fromDate, toDate),
  );

  const courseAverage = gradeAverageInScale(grades);
  return {
    studentId,
    courseId,
    count: grades.length,
    average: courseAverage,
    grades,
  };
};

export const buildStudentReportCard = async ({
  schoolId,
  studentId,
  fromDate,
  toDate,
}) => {
  const courses = await listCoursesForSchool(schoolId);
  const enrollments = await listEnrollmentsForStudent(studentId);
  const courseIds = new Set(enrollments.map((entry) => entry.courseId));
  const studentCourses = courses.filter((course) => courseIds.has(course.id));

  const records = [];
  for (const course of studentCourses) {
    const courseGrades = (await listGradesForStudent(studentId)).filter(
      (grade) =>
        grade.courseId === course.id && inRange(grade.date, fromDate, toDate),
    );

    records.push({
      courseId: course.id,
      courseName: course.name,
      count: courseGrades.length,
      average: gradeAverageInScale(courseGrades),
      grades: courseGrades,
    });
  }

  const included = records.filter((item) => item.average !== null);
  const overallAverage = included.length
    ? included.reduce((sum, item) => sum + item.average, 0) / included.length
    : null;

  const attendanceSummary = {
    present: 0,
    absent: 0,
    late: 0,
  };

  for (const course of studentCourses) {
    const entries = await listAttendanceForCourse(course.id);
    for (const entry of entries) {
      if (entry.studentId !== studentId) continue;
      if (inRange(entry.date, fromDate, toDate)) {
        attendanceSummary[entry.status] =
          (attendanceSummary[entry.status] || 0) + 1;
      }
    }
  }

  return { records, overallAverage, attendanceSummary };
};

export const comparePeriods = async ({
  schoolId,
  studentId,
  firstRange,
  secondRange,
}) => {
  const [first, second] = [firstRange, secondRange].sort((a, b) =>
    a.fromDate.localeCompare(b.fromDate),
  );
  const studentReportA = await buildStudentReportCard({
    schoolId,
    studentId,
    fromDate: first.fromDate,
    toDate: first.toDate,
  });
  const studentReportB = await buildStudentReportCard({
    schoolId,
    studentId,
    fromDate: second.fromDate,
    toDate: second.toDate,
  });

  const courses = await listCoursesForSchool(schoolId);
  const enrollments = await listEnrollmentsForStudent(studentId);
  const courseIds = new Set(enrollments.map((entry) => entry.courseId));
  const studentCourses = courses.filter((course) => courseIds.has(course.id));

  const perCourse = [];
  for (const course of studentCourses) {
    const a = studentReportA.records.find(
      (item) => item.courseId === course.id,
    ) || { average: null };
    const b = studentReportB.records.find(
      (item) => item.courseId === course.id,
    ) || { average: null };

    if (a.average === null || b.average === null) {
      perCourse.push({
        courseId: course.id,
        courseName: course.name,
        status: "not-enough-data",
        averageBefore: a.average,
        averageAfter: b.average,
      });
      continue;
    }

    const difference = b.average - a.average;
    if (difference > 0) {
      perCourse.push({
        courseId: course.id,
        courseName: course.name,
        status: "progress",
        averageBefore: a.average,
        averageAfter: b.average,
        difference,
      });
    } else {
      perCourse.push({
        courseId: course.id,
        courseName: course.name,
        status: "no-progress",
        averageBefore: a.average,
        averageAfter: b.average,
        difference,
      });
    }
  }

  const overallBefore = studentReportA.overallAverage;
  const overallAfter = studentReportB.overallAverage;

  return {
    baseline: first,
    later: second,
    overallBefore,
    overallAfter,
    overallDifference:
      overallAfter !== null && overallBefore !== null
        ? overallAfter - overallBefore
        : null,
    perCourse,
  };
};
