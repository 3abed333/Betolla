"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCartStore, type CartLineItem } from "@/store/cart-store";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

export function ReorderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const t = useTranslations("account.orders.reorder");
  const tToast = useTranslations("toast");

  async function reorder() {
    setLoading(true);
    const res = await fetch("/api/orders/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(t("couldntReorderTitle"), data.error);
      return;
    }
    if (data.items.length === 0) {
      toast.error(t("nothingToReorderTitle"), t("nothingToReorderBody"));
      return;
    }
    for (const item of data.items as (CartLineItem & { quantity: number })[]) {
      addItem(item, item.quantity);
    }
    toast.success(
      tToast("addedToCartTitle"),
      data.skippedCount > 0 ? t("itemsSkipped", { count: data.skippedCount }) : t("allItemsAdded"),
    );
    router.push("/cart");
  }

  return (
    <Button variant="outline" size="sm" onClick={reorder} disabled={loading}>
      {loading ? t("adding") : t("reorder")}
    </Button>
  );
}
