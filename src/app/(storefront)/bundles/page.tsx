import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { Badge, EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";
import { getActiveBundles } from "@/lib/server/storefrontCache";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("storefront.bundles");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function BundlesPage() {
  const t = await getTranslations("storefront.bundles");
  const locale = (await getLocale()) as AppLocale;
  const bundles = await getActiveBundles();

  if (bundles.length === 0) {
    return <EmptyState title={t("noBundlesAvailable")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t("bundlesAndSets")}</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bundles.map((bundle) => {
          const componentTotal = bundle.items.reduce(
            (sum, i) => sum + Number(i.product.price) * i.quantity,
            0,
          );
          const bundleName = localizedField(locale, bundle.nameEn, bundle.nameAr);
          const bundleDescription = localizedField(locale, bundle.descriptionEn, bundle.descriptionAr);
          return (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-secondary transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-surface">
                <Image
                  src={bundle.mainImageUrl}
                  alt={bundleName}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <Badge variant="accent" className="absolute top-3 start-3">
                  {t("bundleAndSave")}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <h3 className="font-medium text-ink">{bundleName}</h3>
                <p className="line-clamp-2 text-sm text-ink-muted">{bundleDescription}</p>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="font-semibold text-ink">
                    <Money value={Number(bundle.bundlePrice)} locale={locale} />
                  </span>
                  <span className="text-sm text-ink-muted line-through">
                    <Money value={componentTotal} locale={locale} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
