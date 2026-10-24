// Mock data for teacher dashboard

export const teacherWallet = {
  balance: 2500000,
  currencyKey: "teacher.wallet.currency",
  lessonFee: 150000,
  isClassCreationFree: true,
};

export const mockTeacher = {
  id: "t1",
  name: "Sarah Johnson",
  email: "sarah.johnson@school.com",
  avatar: null,
  school: "Greenwood Elementary School",
  balance: teacherWallet.balance,
  currencyKey: teacherWallet.currencyKey,
};

export const rechargeTeacherWallet = (amount) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return teacherWallet.balance;
  }

  teacherWallet.balance += amount;
  mockTeacher.balance = teacherWallet.balance;

  return teacherWallet.balance;
};

export const chargeLessonFee = () => {
  if (teacherWallet.balance < teacherWallet.lessonFee) {
    return {
      success: false,
      balance: teacherWallet.balance,
      required: teacherWallet.lessonFee - teacherWallet.balance,
    };
  }

  teacherWallet.balance -= teacherWallet.lessonFee;
  mockTeacher.balance = teacherWallet.balance;

  return {
    success: true,
    balance: teacherWallet.balance,
    charged: teacherWallet.lessonFee,
  };
};

const studentsBase = [
  {
    id: "s1",
    name: "Ava Carter",
    parentName: "Emily Carter",
    parentMobile: "09120000088",
    status: "present",
    grade: 92,
  },
  {
    id: "s2",
    name: "Liam Nguyen",
    parentName: "Daniel Nguyen",
    status: "absent",
    grade: 87,
  },
  {
    id: "s3",
    name: "Noah Patel",
    parentName: "Priya Patel",
    parentMobile: "09120000099",
    status: "late",
    grade: 94,
  },
  {
    id: "s4",
    name: "Mila Hassan",
    parentName: "Sara Hassan",
    status: "present",
    grade: 89,
  },
  {
    id: "s5",
    name: "Ethan Brooks",
    parentName: "Chris Brooks",
    status: "present",
    grade: 91,
  },
];

const buildLessonGradeBook = (students, offset = 0) => {
  const studentScores = students.map((student, studentIndex) => [
    student.id,
    Math.min(
      20,
      Math.max(10, Math.round(student.grade / 5 + offset + studentIndex)),
    ),
  ]);

  return [
    {
      id: `g-${offset + 1}`,
      assessmentKey: "midterm",
      date: "2024-10-10",
      scores: Object.fromEntries(studentScores),
    },
    {
      id: `g-${offset + 2}`,
      assessmentKey: "final",
      date: "2024-11-20",
      scores: Object.fromEntries(
        students.map((student, studentIndex) => [
          student.id,
          Math.min(
            20,
            Math.max(
              12,
              Math.round(student.grade / 5 + offset + studentIndex + 2),
            ),
          ),
        ]),
      ),
    },
  ];
};

const makeLessons = (lessonNames) =>
  lessonNames.map((name, index) => ({
    id: `l${index + 1}`,
    title: name,
    schedule: ["sat", "sun", "mon"][index % 3],
    attendanceRate: [96, 92, 98, 94, 97][index % 5],
    avgGrade: [89, 92, 90, 94, 88][index % 5],
    students: studentsBase.map((student) => ({
      ...student,
      presence: ["present", "present", "late", "absent", "present"][index % 5],
      score: student.grade + (index * 2 - 4),
    })),
    gradeBook: buildLessonGradeBook(studentsBase, index),
  }));

export const mockClasses = [
  {
    id: "c1",
    name: "Grade 1 — Class A",
    grade: "1",
    subject: "General",
    description: "",
    emoji: "🌟",
    schoolYear: "2025-2026",
    color: "bg-purple-100",
    archived: false,
    students: studentsBase,
    lessons: makeLessons(["Mathematics", "Reading", "Science", "Art", "Sports"]),
  },
  {
    id: "c2",
    name: "Grade 2 — Class B",
    grade: "2",
    subject: "General",
    description: "",
    emoji: "🎨",
    schoolYear: "2025-2026",
    color: "bg-blue-100",
    archived: false,
    students: studentsBase.slice(0, 4),
    lessons: makeLessons(["Mathematics", "Reading", "Science"]),
  },
  {
    id: "c3",
    name: "Grade 3 — Mathematics",
    grade: "3",
    subject: "Mathematics",
    description: "",
    emoji: "🔢",
    schoolYear: "2025-2026",
    color: "bg-green-100",
    archived: false,
    students: studentsBase.slice(1, 5),
    lessons: makeLessons(["Mathematics", "Science", "Art"]),
  },
  {
    id: "c4",
    name: "Example Class",
    grade: "",
    subject: "General",
    description: "",
    emoji: "📚",
    schoolYear: "2025-2026",
    color: "bg-yellow-100",
    archived: false,
    isExample: true,
    students: studentsBase.slice(0, 3),
    lessons: makeLessons(["Mathematics"]),
  },
  {
    id: "c5",
    name: "Grade 4 — Music (2024)",
    grade: "4",
    subject: "Music",
    description: "",
    emoji: "🎵",
    schoolYear: "2024-2025",
    color: "bg-pink-100",
    archived: true,
    students: studentsBase.slice(2, 5),
    lessons: makeLessons(["Music"]),
  },
];

export const mockResources = [
  {
    id: "r1",
    key: "activities",
    emoji: "🎯",
    color: "from-pink-200 via-amber-100 to-yellow-200 dark:from-pink-500/30 dark:via-amber-500/20 dark:to-yellow-500/30",
  },
  {
    id: "r2",
    key: "assistant",
    emoji: "💡",
    color: "from-sky-200 via-blue-100 to-indigo-200 dark:from-sky-500/30 dark:via-blue-500/20 dark:to-indigo-500/30",
  },
];
