"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, ConfirmDialog } from "@/components/ui";
import { toast } from "@/lib/toast";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const t = useTranslations("account.orders.detail");

  async function cancelOrder() {
    const response = await fetch(`/api/account/orders/${orderId}/cancel`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(t("couldntCancelTitle"), data.error);
      return;
    }
    toast.success(t("cancelSuccessTitle"));
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          {t("cancelOrder")}
        </Button>
      }
      title={t("cancelDialogTitle")}
      description={t("cancelDialogDescription")}
      confirmLabel={t("confirmCancellation")}
      cancelLabel={t("keepOrder")}
      onConfirm={cancelOrder}
    />
  );
}
