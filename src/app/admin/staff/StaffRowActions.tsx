"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { toast } from "@/lib/toast";

export function StaffRowActions({ staffId, isActive }: { staffId: string; isActive: boolean }) {
  const router = useRouter();
  const t = useTranslations("admin.staff.rowActions");
  const [isPending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function toggleActive() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/staff/${staffId}`, {
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
    const res = await fetch(`/api/admin/staff/${staffId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(t("couldntRemoveTitle"), data.error);
      return;
    }
    toast.success(t("removed"));
    router.refresh();
  }

  async function resetPassword() {
    const res = await fetch(`/api/admin/staff/${staffId}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(t("couldntResetPasswordTitle"), data.error);
      return;
    }
    setTempPassword(data.tempPassword);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={toggleActive} disabled={isPending}>
          {isActive ? t("deactivate") : t("reactivate")}
        </Button>
        <ConfirmDialog
          trigger={<Button size="sm" variant="outline">{t("resetPassword")}</Button>}
          title={t("resetPasswordTitle")}
          description={t("resetPasswordDescription")}
          confirmLabel={t("resetPassword")}
          onConfirm={resetPassword}
        />
        <ConfirmDialog
          trigger={<Button size="sm" variant="destructive">{t("delete")}</Button>}
          title={t("removeTitle")}
          description={t("removeDescription")}
          confirmLabel={t("delete")}
          onConfirm={remove}
        />
      </div>
      <Dialog open={tempPassword !== null} onOpenChange={(open) => !open && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("temporaryPasswordTitle")}</DialogTitle>
            <DialogDescription>{t("temporaryPasswordDescription")}</DialogDescription>
          </DialogHeader>
          <code className="block rounded-md border bg-muted p-4 text-center text-lg font-semibold tracking-wide">
            {tempPassword}
          </code>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>{t("done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
