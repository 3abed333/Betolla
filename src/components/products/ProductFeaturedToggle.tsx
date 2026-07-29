"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui";
import { toast } from "@/lib/toast";

export function ProductFeaturedToggle({
  productId,
  productName,
  initialFeatured,
}: {
  productId: string;
  productName: string;
  initialFeatured: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("admin.products");
  const [featured, setFeatured] = useState(initialFeatured);
  const [saving, setSaving] = useState(false);

  async function updateFeatured(nextFeatured: boolean) {
    setSaving(true);
    const response = await fetch(`/api/products/${productId}/featured`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: nextFeatured }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      toast.error(t("featureSaveFailed"), data.error);
      return;
    }

    setFeatured(nextFeatured);
    toast.success(t(nextFeatured ? "featureAdded" : "featureRemoved"));
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={featured}
        disabled={saving}
        aria-label={t("featureToggleAria", { product: productName })}
        onCheckedChange={updateFeatured}
      />
      <span className="whitespace-nowrap text-xs text-ink-muted">
        {saving ? t("featureSaving") : featured ? t("featured") : t("notFeatured")}
      </span>
    </div>
  );
}
