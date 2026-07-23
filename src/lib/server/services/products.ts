import "server-only";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import type { ProductInput } from "@/lib/validation/product";

export class ProductError extends Error {}

async function uniqueSlug(nameEn: string, excludeId?: string) {
  const base = slugify(nameEn);
  let candidate = base;
  let suffix = 2;
  while (
    await prisma.product.findFirst({ where: { slug: candidate, id: excludeId ? { not: excludeId } : undefined } })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function createProduct(input: ProductInput) {
  const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existingSku) throw new ProductError("That SKU is already in use");

  const slug = await uniqueSlug(input.nameEn);

  return prisma.product.create({
    data: {
      sku: input.sku,
      slug,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      descriptionEn: input.descriptionEn,
      descriptionAr: input.descriptionAr,
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold ?? null,
      categoryId: input.categoryId,
      mainImageUrl: input.mainImageUrl,
      isActive: input.isActive,
      images: { create: input.galleryUrls.map((url, i) => ({ url, sortOrder: i })) },
    },
  });
}

export async function updateProduct(id: string, input: ProductInput) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ProductError("Product not found");

  const existingSku = await prisma.product.findFirst({ where: { sku: input.sku, id: { not: id } } });
  if (existingSku) throw new ProductError("That SKU is already in use");

  const slug = existing.nameEn !== input.nameEn ? await uniqueSlug(input.nameEn, id) : existing.slug;

  await prisma.productImage.deleteMany({ where: { productId: id } });

  return prisma.product.update({
    where: { id },
    data: {
      sku: input.sku,
      slug,
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      descriptionEn: input.descriptionEn,
      descriptionAr: input.descriptionAr,
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      stock: input.stock,
      lowStockThreshold: input.lowStockThreshold ?? null,
      categoryId: input.categoryId,
      mainImageUrl: input.mainImageUrl,
      isActive: input.isActive,
      images: { create: input.galleryUrls.map((url, i) => ({ url, sortOrder: i })) },
    },
  });
}
