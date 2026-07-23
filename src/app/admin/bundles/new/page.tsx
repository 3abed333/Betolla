import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { BundleForm } from "@/components/BundleForm";

export const metadata: Metadata = { title: "Add Bundle - Betolla Admin" };

export default async function NewBundlePage() {
  const t = await getTranslations("admin.bundles");
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    select: { id: true, nameEn: true, price: true },
  });
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("addBundle")}</h2>
      <BundleForm products={products.map((p) => ({ id: p.id, nameEn: p.nameEn, price: p.price.toString() }))} />
    </div>
  );
}
