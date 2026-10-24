const presentStatuses = new Set(["present", "late"]);

const countStatus = (rows = [], statuses = []) =>
  rows.filter((row) => statuses.includes(row?.status)).length;

export function averageGrade(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const totalScore = rows.reduce(
    (sum, row) => sum + Number(row?.score ?? 0),
    0,
  );
  const totalMax = rows.reduce((sum, row) => sum + Number(row?.max ?? 0), 0);

  if (!totalMax) return null;

  return (totalScore / totalMax) * 20;
}

export function buildTeacherAdminStats({
  teacher,
  classes = [],
  courses = [],
  attendance = [],
  grades = [],
  students = [],
  enrollments = [],
}) {
  if (!teacher) {
    return {
      teacher: null,
      totalClasses: 0,
      totalLessons: 0,
      present: 0,
      absent: 0,
      late: 0,
      classSummaries: [],
      lessonSummaries: [],
    };
  }

  const teacherCourses = courses.filter(
    (course) => course.teacherId === teacher.id,
  );
  const courseIds = teacherCourses.map((course) => course.id);
  const teacherAttendance = attendance.filter((record) =>
    courseIds.includes(record.courseId),
  );

  const classIds = [
    ...new Set(teacherCourses.map((course) => course.classId).filter(Boolean)),
  ];

  const classSummaries = classIds.map((classId) => {
    const classInfo = classes.find((item) => item.id === classId);
    const classCourses = teacherCourses.filter(
      (course) => course.classId === classId,
    );
    const courseIdsInClass = classCourses.map((course) => course.id);
    const classAttendance = teacherAttendance.filter((record) =>
      courseIdsInClass.includes(record.courseId),
    );
    const classGrades = grades.filter((grade) =>
      courseIdsInClass.includes(grade.courseId),
    );

    const present = countStatus(classAttendance, [...presentStatuses]);
    const late = countStatus(classAttendance, ["late"]);
    const absent = countStatus(classAttendance, ["absent"]);

    const lessons = classCourses.map((course) => {
      const lessonAttendance = classAttendance.filter(
        (record) => record.courseId === course.id,
      );
      const lessonGrades = classGrades.filter(
        (grade) => grade.courseId === course.id,
      );

      return {
        courseId: course.id,
        name: course.name || "درس نامشخص",
        present: countStatus(lessonAttendance, [...presentStatuses]),
        late: countStatus(lessonAttendance, ["late"]),
        absent: countStatus(lessonAttendance, ["absent"]),
        average: averageGrade(lessonGrades),
        studentCount: enrollments.filter((enrollment) => enrollment.courseId === course.id).length || students.filter((student) => student.classId === classId).length || (classInfo?.studentIds || classInfo?.students || []).length || Number(classInfo?.studentCount || 0),
      };
    });

    return {
      classId,
      name: classInfo?.name || "کلاس نامشخص",
      present,
      late,
      absent,
      average: averageGrade(classGrades),
      studentCount: students.filter((student) => student.classId === classId).length || (classInfo?.studentIds || classInfo?.students || []).length || Number(classInfo?.studentCount || 0),
      lessons,
    };
  });

  const lessonSummaries = teacherCourses.map((course) => {
    const lessonAttendance = teacherAttendance.filter(
      (record) => record.courseId === course.id,
    );
    const lessonGrades = grades.filter((grade) => grade.courseId === course.id);

    return {
      courseId: course.id,
      classId: course.classId,
      className:
        classes.find((item) => item.id === course.classId)?.name || "—",
      name: course.name || "درس نامشخص",
      present: countStatus(lessonAttendance, [...presentStatuses]),
      late: countStatus(lessonAttendance, ["late"]),
      absent: countStatus(lessonAttendance, ["absent"]),
      average: averageGrade(lessonGrades),
    };
  });

  const totals = teacherAttendance.reduce(
    (acc, record) => {
      if (record.status === "present" || record.status === "late") {
        acc.present += 1;
      }
      if (record.status === "late") acc.late += 1;
      if (record.status === "absent") acc.absent += 1;
      return acc;
    },
    { present: 0, late: 0, absent: 0 },
  );

  return {
    teacher,
    totalClasses: classSummaries.length,
    totalLessons: lessonSummaries.length,
    present: totals.present,
    late: totals.late,
    absent: totals.absent,
    classSummaries,
    lessonSummaries,
  };
}
