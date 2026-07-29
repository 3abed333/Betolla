"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button, EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import { localizedField } from "@/lib/localizedField";
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
    <div className="grid min-w-0 grid-cols-1 gap-7 lg:grid-cols-3 lg:gap-10">
      <div className="flex flex-col divide-y divide-border lg:col-span-2">
        {items.map((item, index) => {
          const itemName = localizedField(locale, item.nameEn, item.nameAr);
          return (
          <div key={item.key} className="grid min-w-0 grid-cols-[72px_1fr] gap-3 py-5 sm:grid-cols-[80px_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-secondary sm:h-20 sm:w-20">
              <Image src={item.imageUrl} alt={itemName} fill sizes="80px" className="object-cover" priority={index === 0} />
            </div>
            <div className="min-w-0">
              <Link href={`/${item.kind === "product" ? "products" : "bundles"}/${item.slug}`} className="font-medium text-ink hover:underline">
                {itemName}
              </Link>
              <p className="text-sm text-ink-muted">
                <Money value={item.price} locale={locale} />
              </p>
            </div>
            <div className="col-start-2 row-start-2 flex w-fit items-center rounded-full border border-border sm:col-auto sm:row-auto">
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
            <p className="col-start-2 row-start-2 self-center justify-self-end whitespace-nowrap font-medium text-ink sm:col-auto sm:row-auto sm:min-w-20 sm:text-end">
              <Money value={item.price * item.quantity} locale={locale} />
            </p>
            <button onClick={() => removeItem(item.key)} className="col-start-2 w-fit text-sm text-ink-muted underline-offset-2 hover:text-red-600 hover:underline sm:col-span-3 sm:col-start-2 sm:justify-self-end">
              {t("remove")}
            </button>
          </div>
          );
        })}
      </div>

      <div className="sticky bottom-3 z-20 h-fit rounded-2xl border border-border bg-surface-secondary p-5 shadow-lg sm:p-6 lg:top-24 lg:shadow-none">
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
