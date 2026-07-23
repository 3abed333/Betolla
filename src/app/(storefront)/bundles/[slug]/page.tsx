import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";
import { AddBundleToCartForm } from "./AddBundleToCartForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await prisma.productBundle.findUnique({ where: { slug } });
  const t = await getTranslations("storefront.bundleDetail");
  const tCommon = await getTranslations("common");
  return {
    title: bundle
      ? t("metaTitle", { name: bundle.nameEn, brand: tCommon("brand") })
      : t("metaTitleFallback", { brand: tCommon("brand") }),
  };
}

export default async function BundleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("storefront.bundleDetail");
  const locale = (await getLocale()) as AppLocale;
  const bundle = await prisma.productBundle.findUnique({
    where: { slug },
    include: { items: { include: { product: true } } },
  });
  if (!bundle || !bundle.isActive) notFound();

  const componentTotal = bundle.items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-secondary">
        <Image src={bundle.mainImageUrl} alt={bundle.nameEn} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-3xl font-semibold text-ink">{bundle.nameEn}</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold text-ink">
            <Money value={Number(bundle.bundlePrice)} locale={locale} />
          </span>
          <span className="text-lg text-ink-muted line-through">
            <Money value={componentTotal} locale={locale} />
          </span>
        </div>
        <p className="text-ink-muted">{bundle.descriptionEn}</p>

        <div className="rounded-2xl border border-border p-4">
          <p className="mb-3 text-sm font-medium text-ink">{t("whatsIncluded")}</p>
          <div className="flex flex-col gap-3">
            {bundle.items.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.product.slug}`}
                className="flex items-center gap-3 text-sm hover:underline"
              >
                <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-surface-secondary">
                  <Image src={item.product.mainImageUrl} alt={item.product.nameEn} fill sizes="48px" className="object-cover" />
                </div>
                <span className="text-ink">
                  {item.product.nameEn} {item.quantity > 1 && `x${item.quantity}`}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <AddBundleToCartForm
          id={bundle.id}
          slug={bundle.slug}
          nameEn={bundle.nameEn}
          nameAr={bundle.nameAr}
          price={Number(bundle.bundlePrice)}
          imageUrl={bundle.mainImageUrl}
        />
      </div>
    </div>
  );
}
