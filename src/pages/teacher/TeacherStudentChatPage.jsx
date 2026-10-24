import { AlertTriangle, ArrowLeft, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { mockTeacher } from "../../data/mockTeacherData";
import { useParentMessages } from "../../data/parentMessageStore";
import { useStudentAlerts } from "../../data/studentAlertsStore";
import { useTeacherClasses } from "../../data/teacherStore";
import TeacherSidebar from "../../components/teacher/TeacherSidebar";
import TeacherTopbar from "../../components/teacher/TeacherTopbar";
import { formatDateTime } from "../../utils/dateFormat";

export default function TeacherStudentChatPage() {
  const { t, i18n } = useTranslation();
  const { classId, studentId } = useParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [alertInput, setAlertInput] = useState("");

  const { getClass } = useTeacherClasses();
  const classData = getClass(classId);
  const student = classData?.students.find((item) => item.id === studentId);

  // Real conversation with the parent of this student (shared with the parent panel).
  const { forStudent, send } = useParentMessages();
  const { forStudent: alertsForStudent, send: sendAlert } = useStudentAlerts();
  const messages = forStudent(classId, studentId);
  const studentAlerts = alertsForStudent(classId, studentId);
  const canMessage = Boolean(student?.parentMobile);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  if (!classData || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-black text-foreground">
            {t("teacher.class.studentNotFound")}
          </h1>
          <Link to={`/teacher/class/${classId}`} className="mt-4 inline-block">
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              {t("teacher.class.backToClass")}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const sendMessage = () => {
    if (!input.trim() || !canMessage) return;
    if (
      send({
        classId,
        studentId,
        parentMobile: student.parentMobile,
        sender: "teacher",
        text: input,
      })
    ) {
      setInput("");
    }
  };

  const sendStudentAlert = () => {
    if (!alertInput.trim()) return;
    sendAlert({
      classId,
      studentId,
      parentMobile: student.parentMobile ?? null,
      text: alertInput,
    });
    setAlertInput("");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 transition-all duration-300">
        <TeacherTopbar
          teacher={mockTeacher}
          onToggleMobileMenu={() => setMobileSidebarOpen((prev) => !prev)}
        />

        <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <div className="mb-6">
            <Link
              to={`/teacher/class/${classId}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              <ArrowLeft size={16} />
              {t("teacher.class.backToClass")}
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User size={18} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-foreground">
                    {student.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("teacher.class.parentLabel", {
                      parentName: student.parentName,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-border bg-amber-50/40 p-5 dark:bg-amber-500/5">
              <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle size={16} aria-hidden="true" />
                <h2 className="text-sm font-black">
                  {t("teacher.studentAlerts.title")}
                </h2>
              </div>
              <textarea
                value={alertInput}
                onChange={(event) => setAlertInput(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={t("teacher.studentAlerts.placeholder")}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={sendStudentAlert}
                  disabled={!alertInput.trim()}
                  className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {t("teacher.studentAlerts.send")}
                </button>
              </div>
            </div>

            <div className="max-h-[28rem] min-h-40 space-y-4 overflow-y-auto p-5">
              {studentAlerts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                    {t("teacher.studentAlerts.recent")}
                  </h3>
                  {[...studentAlerts].reverse().map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10"
                    >
                      <p
                        className="whitespace-pre-line break-words text-sm font-bold text-foreground"
                        dir="auto"
                      >
                        {alert.text}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDateTime(alert.createdAt, i18n.language)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!canMessage && (
                <p className="rounded-2xl border border-dashed border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                  {t("teacher.chat.noParentLink")}
                </p>
              )}
              {canMessage && messages.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("teacher.chat.empty")}
                </p>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "teacher" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                      message.sender === "teacher"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-line break-words" dir="auto">
                      {message.text}
                    </p>
                    <p className="mt-1 text-[11px] opacity-70">
                      {formatDateTime(message.createdAt, i18n.language)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendMessage();
                  }}
                  disabled={!canMessage}
                  maxLength={1000}
                  placeholder={t("teacher.class.chatPlaceholder")}
                  className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!canMessage || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  <Send size={16} />
                  {t("teacher.class.send")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
