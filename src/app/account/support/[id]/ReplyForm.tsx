"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Textarea } from "@/components/ui";
import { toast } from "@/lib/toast";

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const t = useTranslations("account.support.reply");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    const res = await fetch(`/api/support-tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      toast.error(t("couldntSendTitle"), data.error);
      return;
    }
    setMessage("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        placeholder={t("placeholder")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button onClick={send} disabled={sending} className="self-end">
        {sending ? t("sending") : t("sendReply")}
      </Button>
    </div>
  );
}
