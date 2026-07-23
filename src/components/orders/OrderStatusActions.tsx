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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { toast } from "@/lib/toast";

const NEXT_STATUS: Record<string, string | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "ON_DELIVERY",
  ON_DELIVERY: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

export function OrderStatusActions({
  orderId,
  status,
  drivers,
}: {
  orderId: string;
  status: string;
  drivers: { id: string; firstName: string; lastName: string }[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.ordersShared");
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [driverId, setDriverId] = useState("");

  function advance() {
    const next = NEXT_STATUS[status];
    if (!next) return;
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(t("couldntUpdateOrder"), data.error);
        return;
      }
      toast.success(t("orderUpdated"));
      router.refresh();
    });
  }

  function cancel() {
    if (!reason.trim()) return;
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", cancellationReason: reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(t("couldntCancelOrder"), data.error);
        return;
      }
      toast.success(t("orderCancelled"));
      setCancelOpen(false);
      router.refresh();
    });
  }

  function assignDriver() {
    if (!driverId) return;
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(t("couldntAssignDriver"), data.error);
        return;
      }
      toast.success(t("driverAssigned"));
      router.refresh();
    });
  }

  const next = NEXT_STATUS[status];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {next && (
        <Button size="sm" onClick={advance} disabled={isPending}>
          {t(`nextStatus.${status}`)}
        </Button>
      )}

      {(status === "PENDING" || status === "CONFIRMED") && (
        <div className="flex items-center gap-2">
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder={t("assignDriverPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={assignDriver} disabled={isPending || !driverId}>
            {t("assign")}
          </Button>
        </div>
      )}

      {status !== "DELIVERED" && status !== "CANCELLED" && (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive">
              {t("cancelOrder")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("cancelDialogTitle")}</DialogTitle>
            </DialogHeader>
            <Textarea
              label={t("cancellationReasonLabel")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("neverMind")}</Button>
              </DialogClose>
              <Button variant="destructive" onClick={cancel} disabled={isPending || !reason.trim()}>
                {t("cancelOrder")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
