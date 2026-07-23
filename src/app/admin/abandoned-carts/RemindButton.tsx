"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

export function RemindButton({ cartId }: { cartId: string }) {
  const t = useTranslations("admin.abandonedCarts.remindButton");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    setSending(true);
    const res = await fetch(`/api/admin/abandoned-carts/${cartId}/remind`, { method: "POST" });
    setSending(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(t("couldntSendTitle"), data.error);
      return;
    }
    toast.success(t("sent"));
    setSent(true);
  }

  return (
    <Button size="sm" variant="outline" onClick={send} disabled={sending || sent}>
      {sent ? t("sent") : sending ? t("sending") : t("send")}
    </Button>
  );
}
