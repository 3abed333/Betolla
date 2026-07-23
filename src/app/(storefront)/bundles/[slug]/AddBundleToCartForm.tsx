"use client";

import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

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
  const addItem = useCartStore((s) => s.addItem);

  function addToCart() {
    addItem({ key: `bundle:${id}`, kind: "bundle", id, slug, nameEn, nameAr, price, imageUrl });
    toast.success(tToast("addedToCartTitle"), nameEn);
  }

  return (
    <Button onClick={addToCart} className="w-full">
      {t("addBundleToCart")}
    </Button>
  );
}
