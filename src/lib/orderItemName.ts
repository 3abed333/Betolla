import type { AppLocale } from "@/i18n/config";
import { localizedField } from "@/lib/localizedField";

type OrderItemNameSource = {
  nameSnapshot: string;
  product: { nameEn: string; nameAr: string | null } | null;
  bundle: { nameEn: string; nameAr: string | null } | null;
};

/** Prefers the live product/bundle name (kept in sync, bilingual) over the order-time
 * English-only snapshot, which only remains as a fallback for items whose product/bundle was
 * later deleted (nullable FK, onDelete: SetNull). */
export function resolveOrderItemName(item: OrderItemNameSource, locale: AppLocale): string {
  if (item.product) return localizedField(locale, item.product.nameEn, item.product.nameAr);
  if (item.bundle) return localizedField(locale, item.bundle.nameEn, item.bundle.nameAr);
  return item.nameSnapshot;
}
