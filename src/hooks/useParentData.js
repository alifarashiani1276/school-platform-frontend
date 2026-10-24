import { useEffect, useMemo, useState } from "react";
import { useAssignments } from "../data/assignmentStore";
import { useClassAttendance } from "../data/classAttendanceStore";
import { useOnlineClasses } from "../data/onlineClassStore";
import { useOnlineExams } from "../data/onlineExamStore";
import { useParentMessages } from "../data/parentMessageStore";
import { useStudentAlerts } from "../data/studentAlertsStore";
import { useTeacherClasses } from "../data/teacherStore";
import { getSession } from "../services/authService";
import {
  buildParentChildren,
  getSchoolChildReport,
} from "../services/parentService";
import useSchoolData from "./useSchoolData";

// The ONE entry point of the parent panel. It resolves the signed-in parent and
// returns only that parent's children (see parentService for the access rules).
export default function useParentData() {
  const appData = useSchoolData();
  const { classes: teacherClasses } = useTeacherClasses();
  const { assignments } = useAssignments();
  const { all: onlineClasses } = useOnlineClasses();
  const { all: onlineExams } = useOnlineExams();
  const { all: classAttendance } = useClassAttendance();
  const { messages } = useParentMessages();
  const { alerts: studentAlerts } = useStudentAlerts();
  const [mobile, setMobile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({});

  useEffect(() => {
    let active = true;
    const sync = () =>
      getSession().then((session) => {
        if (!active) return;
        setMobile(session?.role === "parent" ? (session.mobile ?? null) : null);
        setLoading(false);
      });
    sync();
    window.addEventListener("school:storage", sync);
    return () => {
      active = false;
      window.removeEventListener("school:storage", sync);
    };
  }, []);

  const base = useMemo(
    () =>
      buildParentChildren(mobile, {
        appData,
        teacherClasses,
        assignments,
        onlineClasses,
        onlineExams,
        classAttendance,
        studentAlerts,
      }),
    [
      mobile,
      appData,
      teacherClasses,
      assignments,
      onlineClasses,
      onlineExams,
      classAttendance,
      studentAlerts,
    ],
  );

  // Reports of the school records come from the existing report service.
  const schoolIds = base
    .filter((c) => c.source === "school")
    .map((c) => c.id)
    .join("|");
  useEffect(() => {
    if (!mobile || !schoolIds) return undefined;
    let active = true;
    Promise.all(
      schoolIds.split("|").map((id) =>
        getSchoolChildReport(mobile, id)
          .then((report) => [`school:${id}`, report])
          .catch(() => null),
      ),
    ).then((entries) => {
      if (active) setReports(Object.fromEntries(entries.filter(Boolean)));
    });
    return () => {
      active = false;
    };
  }, [mobile, schoolIds, appData]);

  const children = useMemo(
    () =>
      base.map((child) => {
        const report = reports[child.key] ?? null;
        if (child.source !== "school" || !report) return child;
        return {
          ...child,
          report,
          average: report.overallAverage,
          subjects: child.subjects.map((subject) => ({
            ...subject,
            average:
              report.records.find((r) => r.courseId === subject.id)?.average ??
              null,
          })),
        };
      }),
    [base, reports],
  );

  return { loading, mobile, children, messages };
}
