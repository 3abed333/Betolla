import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { PromoCodeRowActions } from "./PromoCodeRowActions";

export const metadata: Metadata = { title: "Promo Codes - Betolla Admin" };

function formatDiscount(discountType: string, discountValue: string, locale: AppLocale) {
  return discountType === "PERCENTAGE" ? `${Number(discountValue)}%` : formatCurrency(discountValue, locale);
}

export default async function AdminPromoCodesPage() {
  const t = await getTranslations("admin.promoCodes");
  const tCommon = await getTranslations("common");
  const tSegment = await getTranslations("common.promoSegment");
  const locale = (await getLocale()) as AppLocale;
  const promoCodes = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usages: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <Button size="sm" asChild>
          <Link href="/admin/promo-codes/new">{t("addPromoCode")}</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("headers.code")}</TableHead>
            <TableHead>{t("headers.discount")}</TableHead>
            <TableHead>{t("headers.segment")}</TableHead>
            <TableHead>{t("headers.usage")}</TableHead>
            <TableHead>{t("headers.status")}</TableHead>
            <TableHead>{t("headers.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promoCodes.map((promo) => (
            <TableRow key={promo.id}>
              <TableCell>
                <p className="font-mono font-medium text-ink">{promo.code}</p>
              </TableCell>
              <TableCell>{formatDiscount(promo.discountType, promo.discountValue.toString(), locale)}</TableCell>
              <TableCell>{tSegment(promo.targetSegment)}</TableCell>
              <TableCell>
                {promo._count.usages}
                {promo.usageLimitTotal !== null && ` / ${promo.usageLimitTotal}`}
              </TableCell>
              <TableCell>
                <Badge variant={promo.isActive ? "success" : "neutral"}>
                  {promo.isActive ? tCommon("active") : tCommon("inactive")}
                </Badge>
              </TableCell>
              <TableCell>
                <PromoCodeRowActions
                  promoCodeId={promo.id}
                  detailHref={`/admin/promo-codes/${promo.id}`}
                  editHref={`/admin/promo-codes/${promo.id}/edit`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
