"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { toast } from "@/lib/toast";
import { SUPPORT_CATEGORIES } from "@/lib/supportCategories";

export function NewTicketDialog({ orders }: { orders: { id: string; label: string }[] }) {
  const router = useRouter();
  const t = useTranslations("account.support.newTicket");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0].value);
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, category, message, orderId }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntCreateTitle"), data.error);
      return;
    }
    setOpen(false);
    setSubject("");
    setMessage("");
    router.push(`/account/support/${data.ticket.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-ink">{t("categoryLabel")}</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {t(`categories.${c.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">{t("orderLabel")}</label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={t("orderPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {orders.length === 0 && <p className="mt-1 text-xs text-ink-muted">{t("noOrdersMessage")}</p>}
          </div>
          <Input label={t("subjectLabel")} value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea label={t("messageLabel")} value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              {tCommon("cancel")}
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting || !subject.trim() || !message.trim() || !orderId}>
            {submitting ? t("sending") : t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
