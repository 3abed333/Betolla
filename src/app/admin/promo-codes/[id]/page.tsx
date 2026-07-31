import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Button } from "@/components/ui";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.promoCodes.detail");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function PromoCodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("admin.promoCodes.detail");
  const tCommon = await getTranslations("common");
  const tSegment = await getTranslations("common.promoSegment");
  const tRowActions = await getTranslations("admin.promoCodes.rowActions");
  const locale = (await getLocale()) as AppLocale;
  const promo = await prisma.promoCode.findUnique({
    where: { id },
    include: {
      usages: {
        orderBy: { usedAt: "desc" },
        include: { user: true, order: { select: { id: true, orderNumber: true } } },
      },
    },
  });
  if (!promo) notFound();

  const totalDiscountGiven = promo.usages.reduce((sum, u) => sum + Number(u.discountAmount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ink">
            <span className="font-mono">{promo.code}</span>
          </h2>
          <p className="text-sm text-ink-muted">{tSegment(promo.targetSegment)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={promo.isActive ? "success" : "neutral"}>
            {promo.isActive ? tCommon("active") : tCommon("inactive")}
          </Badge>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/promo-codes/${promo.id}/edit`}>{tRowActions("edit")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("totalUses")}</p>
          <p className="font-heading text-2xl font-semibold text-ink">
            {promo.usages.length}
            {promo.usageLimitTotal !== null && (
              <span className="text-base font-normal text-ink-muted"> / {promo.usageLimitTotal}</span>
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("totalDiscountGiven")}</p>
          <p className="font-heading text-2xl font-semibold text-ink">
            <Money value={totalDiscountGiven} locale={locale} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("perUserLimit")}</p>
          <p className="font-heading text-2xl font-semibold text-ink">{promo.usageLimitPerUser ?? t("unlimited")}</p>
        </Card>
      </div>

      {promo.usages.length === 0 ? (
        <EmptyState title={t("noUsesTitle")} description={t("noUsesDescription")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("headers.customer")}</TableHead>
              <TableHead>{t("headers.order")}</TableHead>
              <TableHead>{t("headers.discount")}</TableHead>
              <TableHead>{t("headers.usedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promo.usages.map((usage) => (
              <TableRow key={usage.id}>
                <TableCell>
                  <p className="font-medium text-ink">
                    {usage.user.firstName} {usage.user.lastName}
                  </p>
                  <p className="text-xs text-ink-muted">{usage.user.email}</p>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/orders/${usage.order.id}`} className="text-cta hover:underline">
                    {usage.order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Money value={Number(usage.discountAmount)} locale={locale} />
                </TableCell>
                <TableCell>
                  <FormattedDate date={usage.usedAt} locale={locale} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
