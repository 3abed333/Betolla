"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, ConfirmDialog } from "@/components/ui";
import { toast } from "@/lib/toast";

export function DeliveryAccountRowActions({ driverId, isActive }: { driverId: string; isActive: boolean }) {
  const router = useRouter();
  const t = useTranslations("staff.deliveryAccounts.rowActions");
  const [isPending, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      const res = await fetch(`/api/staff/delivery-accounts/${driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(t("couldntUpdateTitle"), data.error);
        return;
      }
      router.refresh();
    });
  }

  async function remove() {
    const res = await fetch(`/api/staff/delivery-accounts/${driverId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(t("couldntRemoveTitle"), data.error);
      return;
    }
    toast.success(t("removed"));
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={toggleActive} disabled={isPending}>
        {isActive ? t("deactivate") : t("reactivate")}
      </Button>
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="destructive">
            {t("delete")}
          </Button>
        }
        title={t("removeTitle")}
        description={t("removeDescription")}
        confirmLabel={t("delete")}
        onConfirm={remove}
      />
    </div>
  );
}
