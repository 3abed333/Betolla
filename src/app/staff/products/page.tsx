import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { Money } from "@/components/Money";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";
import { isLowStock } from "@/lib/server/services/inventory";
import { ProductRowActions } from "@/components/products/ProductRowActions";
import { ProductFeaturedToggle } from "@/components/products/ProductFeaturedToggle";

export const metadata: Metadata = { title: "Products - Betolla Staff" };

export default async function StaffProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const t = await getTranslations("admin.products");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" }, include: { category: true } });
  const visible = filter === "low-stock" ? products.filter(isLowStock) : products;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
          {filter === "low-stock" && <p className="text-sm text-accent">{t("lowStockFilterNote")}</p>}
        </div>
        <div className="flex gap-2">
          {filter === "low-stock" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/staff/products">{t("clearFilter")}</Link>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href="/staff/products/new">{t("addProduct")}</Link>
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("headers.product")}</TableHead>
            <TableHead>{t("headers.category")}</TableHead>
            <TableHead>{t("headers.price")}</TableHead>
            <TableHead>{t("headers.stock")}</TableHead>
            <TableHead>{t("headers.homepage")}</TableHead>
            <TableHead>{t("headers.status")}</TableHead>
            <TableHead>{t("headers.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((product) => {
            const productName = localizedField(locale, product.nameEn, product.nameAr);
            const categoryName = localizedField(locale, product.category.nameEn, product.category.nameAr);
            return (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                    <Image src={product.mainImageUrl} alt={productName} fill sizes="40px" className="object-cover" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">{productName}</p>
                    <p className="text-xs text-ink-muted">{product.sku}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{categoryName}</TableCell>
              <TableCell>
                <Money value={Number(product.price)} locale={locale} />
              </TableCell>
              <TableCell>
                {product.stock}
                {isLowStock(product) && (
                  <Badge variant="accent" className="ms-2">
                    {product.stock === 0 ? t("outOfStock") : t("low")}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <ProductFeaturedToggle
                  productId={product.id}
                  productName={productName}
                  initialFeatured={product.isFeatured}
                />
              </TableCell>
              <TableCell>
                <Badge variant={product.isActive ? "success" : "neutral"}>
                  {product.isActive ? tCommon("active") : tCommon("inactive")}
                </Badge>
              </TableCell>
              <TableCell>
                <ProductRowActions productId={product.id} editHref={`/staff/products/${product.id}/edit`} />
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
