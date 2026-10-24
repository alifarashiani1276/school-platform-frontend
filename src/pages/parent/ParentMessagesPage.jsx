import { MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { MAX_MESSAGE_LENGTH, useParentMessages } from "../../data/parentMessageStore";
import { Card, EmptyBox, PageTitle, inputClass } from "../../components/parent/ParentUi";
import { findOwnThread, parentThreadMessages } from "../../services/parentService";
import { formatDateTime } from "../../utils/dateFormat";

export default function ParentMessagesPage() {
  const { t, i18n } = useTranslation();
  const { child, kids, mobile, messages } = useOutletContext();
  const { send } = useParentMessages();
  const [classId, setClassId] = useState(null);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  const thread = child.threads.find((th) => th.classId === classId) ?? child.threads[0] ?? null;
  const conversation = thread ? parentThreadMessages(messages, mobile, thread) : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [conversation.length, thread?.classId]);

  if (child.threads.length === 0) {
    return (
      <div className="space-y-6">
        <PageTitle title={t("parent.messages.title")} text={t("parent.messages.text")} />
        <EmptyBox>{t("parent.messages.unavailable")}</EmptyBox>
      </div>
    );
  }

  const handleSend = (event) => {
    event.preventDefault();
    // The conversation must belong to one of this parent's own children.
    const own = findOwnThread(kids, child.key, thread.classId);
    if (!own || !text.trim()) return;
    const ok = send({
      classId: own.thread.classId,
      studentId: own.thread.studentId,
      parentMobile: mobile,
      sender: "parent",
      text,
    });
    if (ok) setText("");
  };

  return (
    <div className="space-y-6">
      <PageTitle title={t("parent.messages.title")} text={t("parent.messages.text")} />

      {child.threads.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("parent.messages.classes")}>
          {child.threads.map((th) => (
            <button
              key={th.classId}
              type="button"
              role="tab"
              aria-selected={th.classId === thread.classId}
              onClick={() => setClassId(th.classId)}
              dir="auto"
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                th.classId === thread.classId
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card hover:bg-muted"
              }`}
            >
              {th.className}
            </button>
          ))}
        </div>
      )}

      <Card
        title={t("parent.messages.conversation", { name: child.name })}
        icon={MessageSquare}
      >
        <div className="max-h-96 min-h-40 space-y-3 overflow-y-auto rounded-2xl border border-border bg-muted/50 p-4">
          {conversation.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("parent.messages.empty")}</p>
          ) : (
            conversation.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "parent" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.sender === "parent" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                  }`}
                >
                  <p className="mb-0.5 text-xs font-bold opacity-80">
                    {m.sender === "parent" ? t("parent.messages.you") : t("parent.messages.teacher")}
                  </p>
                  <p className="whitespace-pre-line break-words" dir="auto">
                    {m.text}
                  </p>
                  <p className="mt-1 text-[11px] opacity-70">{formatDateTime(m.createdAt, i18n.language)}</p>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="mt-4 flex items-center gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={t("teacher.class.chatPlaceholder")}
            aria-label={t("parent.messages.compose")}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <Send size={16} className="rtl:-scale-x-100" aria-hidden="true" />
            {t("teacher.class.send")}
          </button>
        </form>
      </Card>
    </div>
  );
}
