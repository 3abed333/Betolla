"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, ConfirmDialog } from "@/components/ui";
import { toast } from "@/lib/toast";

export function ProductRowActions({ productId, editHref }: { productId: string; editHref: string }) {
  const router = useRouter();
  const t = useTranslations("admin.products.rowActions");

  async function remove() {
    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(t("couldntRemoveTitle"), data.error);
      return;
    }
    toast.success(t("deactivated"));
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" asChild>
        <Link href={editHref}>{t("edit")}</Link>
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
