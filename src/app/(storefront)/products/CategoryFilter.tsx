import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { cn } from "@/lib/cn";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export async function CategoryFilter({
  categories,
  activeSlug,
}: {
  categories: { slug: string; nameEn: string; nameAr: string }[];
  activeSlug?: string;
}) {
  const t = await getTranslations("storefront.products");
  const locale = (await getLocale()) as AppLocale;
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/products"
        className={cn(
          "rounded-full border px-4 py-1.5 text-sm transition-colors",
          !activeSlug ? "border-cta bg-cta text-cta-foreground" : "border-border text-ink-muted hover:text-ink",
        )}
      >
        {t("allCategoryFilter")}
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/products?category=${c.slug}`}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm transition-colors",
            activeSlug === c.slug
              ? "border-cta bg-cta text-cta-foreground"
              : "border-border text-ink-muted hover:text-ink",
          )}
        >
          {localizedField(locale, c.nameEn, c.nameAr)}
        </Link>
      ))}
    </div>
  );
}
