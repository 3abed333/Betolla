import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Badge } from "@/components/ui";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import { Money } from "@/components/Money";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export type ProductCardData = {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  price: number;
  compareAtPrice: number | null;
  mainImageUrl: string;
  avgRating: number;
  reviewCount: number;
  stock: number;
};

export async function ProductCard({ product }: { product: ProductCardData }) {
  const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
  const t = await getTranslations("storefront.productCard");
  const locale = (await getLocale()) as AppLocale;
  const name = localizedField(locale, product.nameEn, product.nameAr);
  const description = localizedField(locale, product.descriptionEn, product.descriptionAr);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-secondary transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface">
        <Image
          src={product.mainImageUrl}
          alt={name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {onSale && (
          <Badge variant="accent" className="absolute top-3 start-3">
            {t("sale")}
          </Badge>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="neutral">{t("outOfStock")}</Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-medium text-ink">{name}</h3>
        <p className="line-clamp-2 text-sm text-ink-muted">{description}</p>
        {product.reviewCount > 0 && (
          <StarRatingDisplay rating={product.avgRating} count={product.reviewCount} />
        )}
        <div className="mt-auto pt-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-semibold text-ink">
              <Money value={product.price} locale={locale} />
            </span>
            {onSale && (
              <span className="text-sm text-ink-muted line-through">
                <Money value={product.compareAtPrice!} locale={locale} />
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
