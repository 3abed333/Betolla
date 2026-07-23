"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Textarea,
} from "@/components/ui";
import { toast } from "@/lib/toast";

const NEXT_STATUS: Record<string, string | null> = {
  ASSIGNED: "PICKED_UP",
  PICKED_UP: "EN_ROUTE",
  EN_ROUTE: "DELIVERED",
  DELIVERED: null,
  FAILED: null,
};

export function DeliveryStatusActions({ assignmentId, status }: { assignmentId: string; status: string }) {
  const router = useRouter();
  const t = useTranslations("delivery.statusActions");
  const [isPending, startTransition] = useTransition();
  const [failOpen, setFailOpen] = useState(false);
  const [reason, setReason] = useState("");

  function advance() {
    const next = NEXT_STATUS[status];
    if (!next) return;
    startTransition(async () => {
      const res = await fetch(`/api/delivery/assignments/${assignmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(t("couldntUpdateTitle"), data.error);
        return;
      }
      toast.success(t("updated"));
      router.refresh();
    });
  }

  function fail() {
    if (!reason.trim()) return;
    startTransition(async () => {
      const res = await fetch(`/api/delivery/assignments/${assignmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FAILED", failedReason: reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(t("couldntUpdateTitle"), data.error);
        return;
      }
      toast.success(t("markedFailed"));
      setFailOpen(false);
      router.refresh();
    });
  }

  const next = NEXT_STATUS[status];
  if (!next) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" onClick={advance} disabled={isPending}>
        {t(`nextStatus.${status}`)}
      </Button>
      <Dialog open={failOpen} onOpenChange={setFailOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive">
            {t("markFailed")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("markFailedDialogTitle")}</DialogTitle>
          </DialogHeader>
          <Textarea label={t("reasonRequired")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("neverMind")}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={fail} disabled={isPending || !reason.trim()}>
              {t("markFailed")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
