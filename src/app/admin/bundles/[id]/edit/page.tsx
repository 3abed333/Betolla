import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { BundleForm } from "@/components/BundleForm";

export const metadata: Metadata = { title: "Edit Bundle - Betolla Admin" };

export default async function EditBundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("admin.bundles");
  const [bundle, products] = await Promise.all([
    prisma.productBundle.findUnique({ where: { id }, include: { items: true } }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, price: true },
    }),
  ]);
  if (!bundle) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("editBundle")}</h2>
      <BundleForm
        products={products.map((p) => ({ id: p.id, nameEn: p.nameEn, price: p.price.toString() }))}
        bundleId={bundle.id}
        initialValues={{
          nameEn: bundle.nameEn,
          nameAr: bundle.nameAr,
          descriptionEn: bundle.descriptionEn,
          descriptionAr: bundle.descriptionAr,
          bundlePrice: bundle.bundlePrice.toString(),
          mainImageUrl: bundle.mainImageUrl,
          isActive: bundle.isActive,
          itemProductIds: bundle.items.map((i) => i.productId),
        }}
      />
    </div>
  );
}
