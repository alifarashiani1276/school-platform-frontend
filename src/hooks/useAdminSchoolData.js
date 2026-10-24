import { useMemo } from "react";
import { scopeDataToSchool } from "../services/schoolRegistry";
import { readStorage } from "../services/storage";
import useSchoolData from "./useSchoolData";

// School data limited to the signed-in manager's own school, so one school's
// manager never sees another school's teachers, students or classes.
export default function useAdminSchoolData() {
  const data = useSchoolData();
  const schoolId = readStorage("session", null)?.schoolId ?? null;
  return useMemo(() => scopeDataToSchool(data, schoolId), [data, schoolId]);
}
