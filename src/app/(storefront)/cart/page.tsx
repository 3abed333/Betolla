"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button, EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";

export default function CartPage() {
  const t = useTranslations("storefront.cart");
  const locale = useLocale() as AppLocale;
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());
  const { data: user } = useCurrentUser();
  const router = useRouter();

  function goToCheckout() {
    if (!user) {
      router.push("/login?next=/checkout");
      return;
    }
    router.push("/checkout");
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Button asChild>
            <Link href="/products">{t("shopProducts")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col divide-y divide-border lg:col-span-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-4 py-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
              <Image src={item.imageUrl} alt={item.nameEn} fill sizes="80px" className="object-cover" />
            </div>
            <div className="flex-1">
              <Link href={`/${item.kind === "product" ? "products" : "bundles"}/${item.slug}`} className="font-medium text-ink hover:underline">
                {item.nameEn}
              </Link>
              <p className="text-sm text-ink-muted">
                <Money value={item.price} locale={locale} />
              </p>
            </div>
            <div className="flex items-center rounded-full border border-border">
              <button
                onClick={() => setQuantity(item.key, item.quantity - 1)}
                className="flex h-9 w-9 items-center justify-center text-ink-muted hover:text-ink"
                aria-label={t("decreaseQuantity")}
              >
                -
              </button>
              <span className="w-6 text-center text-sm text-ink">{item.quantity}</span>
              <button
                onClick={() => setQuantity(item.key, item.quantity + 1)}
                className="flex h-9 w-9 items-center justify-center text-ink-muted hover:text-ink"
                aria-label={t("increaseQuantity")}
                disabled={!!item.maxStock && item.quantity >= item.maxStock}
              >
                +
              </button>
            </div>
            <p className="w-20 text-end font-medium text-ink">
              <Money value={item.price * item.quantity} locale={locale} />
            </p>
            <button onClick={() => removeItem(item.key)} className="text-sm text-ink-muted hover:text-red-600">
              {t("remove")}
            </button>
          </div>
        ))}
      </div>

      <div className="h-fit rounded-2xl border border-border bg-surface-secondary p-6">
        <h2 className="font-heading text-lg font-semibold text-ink">{t("orderSummary")}</h2>
        <div className="mt-4 flex justify-between text-sm text-ink-muted">
          <span>{t("subtotal")}</span>
          <span>
            <Money value={subtotal} locale={locale} />
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">{t("shippingNote")}</p>
        <Button onClick={goToCheckout} className="mt-6 w-full">
          {t("proceedToCheckout")}
        </Button>
      </div>
    </div>
  );
}
