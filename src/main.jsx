import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./i18n";
import "./index.css";
import { ThemeProvider } from "./themes/ThemeProvider";
import RouteGuard from "./components/RouteGuard";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterSchoolPage from "./pages/RegisterSchoolPage";
import SuperAdminDashboard from "./pages/super/SuperAdminDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTeacherDetail from "./pages/admin/AdminTeacherDetail";
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentFamilyPage from "./pages/parent/ParentFamilyPage";
import ParentLayout from "./components/parent/ParentLayout";
import ParentSchedulePage from "./pages/parent/ParentSchedulePage";
import ParentAttendancePage from "./pages/parent/ParentAttendancePage";
import ParentGradesPage from "./pages/parent/ParentGradesPage";
import ParentAssignmentsPage from "./pages/parent/ParentAssignmentsPage";
import ParentMessagesPage from "./pages/parent/ParentMessagesPage";
import NotFoundPage from "./pages/NotFoundPage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClassDetails from "./pages/teacher/TeacherClassDetails";
import TeacherLessonPage from "./pages/teacher/TeacherLessonPage";
import TeacherAttendancePage from "./pages/teacher/TeacherAttendancePage";
import TeacherStudentChatPage from "./pages/teacher/TeacherStudentChatPage";
import TeacherWalletPage from "./pages/teacher/TeacherWalletPage";
import TeacherSectionPage from "./pages/teacher/TeacherSectionPage";
import TeacherAssignmentsPage from "./pages/teacher/TeacherAssignmentsPage";
import TeacherOnlineClassPage from "./pages/teacher/TeacherOnlineClassPage";
import TeacherOnlineExamPage from "./pages/teacher/TeacherOnlineExamPage";
import TeacherQuestionBankPage from "./pages/teacher/TeacherQuestionBankPage";
import TeacherClassAttendancePage from "./pages/teacher/TeacherClassAttendancePage";
import TeacherStudentProgressPage from "./pages/teacher/TeacherStudentProgressPage";
import TeacherWeeklyPlanPage from "./pages/teacher/TeacherWeeklyPlanPage";
import TeacherOverviewPage from "./pages/teacher/TeacherOverviewPage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-school" element={<RegisterSchoolPage />} />
        <Route
          path="/super"
          element={
            <RouteGuard allowedRole="superadmin">
              <SuperAdminDashboard />
            </RouteGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <RouteGuard allowedRole="admin">
              <AdminDashboard />
            </RouteGuard>
          }
        />
        <Route
          path="/admin/teacher/:teacherId"
          element={
            <RouteGuard allowedRole="admin">
              <AdminTeacherDetail />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherDashboard />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/overview"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherOverviewPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/question-bank"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherQuestionBankPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/wallet"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherWalletPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/weekly-plan"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherWeeklyPlanPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/:section"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherSectionPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherClassDetails />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/assignments"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherAssignmentsPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/attendance"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherClassAttendancePage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/weekly-plan"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherWeeklyPlanPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/online"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherOnlineClassPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/exam"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherOnlineExamPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/lesson/:lessonId"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherLessonPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/attendance/:lessonId"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherAttendancePage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/student/:studentId/progress"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherStudentProgressPage />
            </RouteGuard>
          }
        />
        <Route
          path="/teacher/class/:classId/student/:studentId"
          element={
            <RouteGuard allowedRole="teacher">
              <TeacherStudentChatPage />
            </RouteGuard>
          }
        />
        <Route
          path="/parent"
          element={
            <RouteGuard allowedRole="parent">
              <ParentLayout />
            </RouteGuard>
          }
        >
          <Route index element={<ParentDashboard />} />
          <Route path="family" element={<ParentFamilyPage />} />
          <Route path="schedule" element={<ParentSchedulePage />} />
          <Route path="attendance" element={<ParentAttendancePage />} />
          <Route path="grades" element={<ParentGradesPage />} />
          <Route path="assignments" element={<ParentAssignmentsPage />} />
          <Route path="messages" element={<ParentMessagesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>,
);
