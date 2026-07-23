import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/ProductForm";

export const metadata: Metadata = { title: "Add Product - Betolla Staff" };

export default async function StaffNewProductPage() {
  const t = await getTranslations("admin.products");
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("addProduct")}</h2>
      <ProductForm categories={categories} redirectPath="/staff/products" />
    </div>
  );
}
