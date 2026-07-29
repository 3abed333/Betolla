"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ConfirmDialog } from "@/components/ui";
import { toast } from "@/lib/toast";

export function ReviewModerationActions({ id, isPublished }: { id: string; isPublished: boolean }) {
  const t = useTranslations("admin.reviews");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setPublished(value: boolean) {
    setPending(true);
    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: value }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      toast.error(t("error"), data.error);
      return;
    }
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const response = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      toast.error(t("couldntDelete"), data.error);
      return;
    }
    toast.success(t("deleted"));
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {isPublished ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setPublished(false)}>
          {t("hide")}
        </Button>
      ) : (
        <Button size="sm" variant="primary" disabled={pending} onClick={() => setPublished(true)}>
          {t("approve")}
        </Button>
      )}
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="destructive" disabled={pending}>
            {isPublished ? t("deletePermanently") : t("reject")}
          </Button>
        }
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription")}
        confirmLabel={isPublished ? t("deletePermanently") : t("reject")}
        onConfirm={remove}
      />
    </div>
  );
}
