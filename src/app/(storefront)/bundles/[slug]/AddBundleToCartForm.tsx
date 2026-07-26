"use client";

import { useTranslations, useLocale } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export function AddBundleToCartForm({
  id,
  slug,
  nameEn,
  nameAr,
  price,
  imageUrl,
}: {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  price: number;
  imageUrl: string;
}) {
  const t = useTranslations("storefront.bundles");
  const tToast = useTranslations("toast");
  const locale = useLocale() as AppLocale;
  const addItem = useCartStore((s) => s.addItem);

  function addToCart() {
    addItem({ key: `bundle:${id}`, kind: "bundle", id, slug, nameEn, nameAr, price, imageUrl });
    toast.success(tToast("addedToCartTitle"), localizedField(locale, nameEn, nameAr));
  }

  return (
    <Button onClick={addToCart} className="w-full">
      {t("addBundleToCart")}
    </Button>
  );
}
