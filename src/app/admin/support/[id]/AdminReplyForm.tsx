"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Textarea, Checkbox } from "@/components/ui";
import { toast } from "@/lib/toast";

export function AdminReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const t = useTranslations("admin.support.reply");
  const [message, setMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    const res = await fetch(`/api/support-tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, isInternalNote }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      toast.error(t("couldntSendTitle"), data.error);
      return;
    }
    setMessage("");
    setIsInternalNote(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        placeholder={isInternalNote ? t("internalNotePlaceholder") : t("replyPlaceholder")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox checked={isInternalNote} onCheckedChange={(c) => setIsInternalNote(c === true)} />
          {t("internalNoteCheckbox")}
        </label>
        <Button onClick={send} disabled={sending}>
          {sending ? t("sending") : isInternalNote ? t("addNote") : t("sendReply")}
        </Button>
      </div>
    </div>
  );
}
