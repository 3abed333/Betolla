"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

export function AddToCartForm({
  id,
  slug,
  nameEn,
  nameAr,
  price,
  imageUrl,
  stock,
}: {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  price: number;
  imageUrl: string;
  stock: number;
}) {
  const t = useTranslations("storefront.productDetail");
  const tToast = useTranslations("toast");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();

  function addToCart() {
    addItem(
      { key: `product:${id}`, kind: "product", id, slug, nameEn, nameAr, price, imageUrl, maxStock: stock },
      quantity,
    );
    toast.success(tToast("addedToCartTitle"), `${nameEn} x${quantity}`);
  }

  function buyNow() {
    addToCart();
    router.push("/cart");
  }

  if (stock === 0) {
    return (
      <Button disabled className="w-full">
        {t("outOfStock")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-ink-muted hover:text-ink"
            aria-label={t("decreaseQuantity")}
          >
            -
          </button>
          <span className="w-8 text-center text-ink">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            className="flex h-11 w-11 items-center justify-center text-ink-muted hover:text-ink"
            aria-label={t("increaseQuantity")}
          >
            +
          </button>
        </div>
        <Button onClick={addToCart} className="flex-1">
          {t("addToCart")}
        </Button>
      </div>
      <Button onClick={buyNow} variant="secondary" className="w-full">
        {t("buyNow")}
      </Button>
    </div>
  );
}
