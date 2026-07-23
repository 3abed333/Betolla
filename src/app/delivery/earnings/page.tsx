import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

export const metadata: Metadata = { title: "Earnings - Betolla Delivery" };

export default async function DeliveryEarningsPage() {
  const session = await requireRole("DELIVERY");
  const t = await getTranslations("delivery.earnings");
  const locale = (await getLocale()) as AppLocale;

  const delivered = await prisma.deliveryAssignment.findMany({
    where: { driverId: session.userId, status: "DELIVERED" },
    orderBy: { deliveredAt: "desc" },
    include: { order: { select: { orderNumber: true } } },
  });

  const totalEarnings = delivered.reduce((sum, a) => sum + Number(a.earningsAmount), 0);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEarnings = delivered
    .filter((a) => a.deliveredAt && a.deliveredAt >= startOfMonth)
    .reduce((sum, a) => sum + Number(a.earningsAmount), 0);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("totalEarnings")}</p>
          <p className="font-heading text-2xl font-semibold text-ink">
            <Money value={totalEarnings} locale={locale} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("thisMonth")}</p>
          <p className="font-heading text-2xl font-semibold text-ink">
            <Money value={thisMonthEarnings} locale={locale} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("deliveriesCompleted")}</p>
          <p className="font-heading text-2xl font-semibold text-ink">{delivered.length}</p>
        </Card>
      </div>

      {delivered.length === 0 ? (
        <EmptyState title={t("noEarningsTitle")} description={t("noEarningsDescription")} />
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border">
            {delivered.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-ink">{a.order.orderNumber}</p>
                  <p className="text-xs text-ink-muted">
                    {a.deliveredAt && <FormattedDate date={a.deliveredAt} locale={locale} />}
                  </p>
                </div>
                <span className="text-success">
                  +<Money value={Number(a.earningsAmount)} locale={locale} />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
