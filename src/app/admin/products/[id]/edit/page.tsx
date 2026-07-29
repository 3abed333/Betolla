import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/ProductForm";

export const metadata: Metadata = { title: "Edit Product - Betolla Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("admin.products");
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, knowledge: true } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("editProduct")}</h2>
      <ProductForm
        categories={categories}
        productId={product.id}
        initialValues={{
          sku: product.sku,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          descriptionEn: product.descriptionEn,
          descriptionAr: product.descriptionAr,
          price: product.price.toString(),
          compareAtPrice: product.compareAtPrice?.toString() ?? "",
          stock: product.stock.toString(),
          lowStockThreshold: product.lowStockThreshold?.toString() ?? "",
          categoryId: product.categoryId,
          mainImageUrl: product.mainImageUrl,
          galleryUrls: product.images.map((i) => i.url),
          isActive: product.isActive,
          knowledgeHtmlEn: product.knowledge?.contentHtmlEn ?? "",
          knowledgeHtmlAr: product.knowledge?.contentHtmlAr ?? "",
          knowledgeActive: product.knowledge?.isActive ?? false,
        }}
      />
    </div>
  );
}
