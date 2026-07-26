import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

export const metadata: Metadata = { title: "Today's Collections - Betolla Delivery" };

// Drivers are salaried, not paid per delivery - a Cash-on-Delivery order's total is the customer's
// money, collected on the company's behalf and owed to the accountant, not the driver's earnings.
// This page answers "how much cash do I need to hand over today," not "how much have I earned" -
// see DeliveryAssignment.earningsAmount (the driver's own shipping-fee pay) for the latter, which
// this page deliberately does not show.
export default async function DeliveryCollectionsPage() {
  const session = await requireRole("DELIVERY");
  const t = await getTranslations("delivery.collections");
  const locale = (await getLocale()) as AppLocale;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const deliveredToday = await prisma.deliveryAssignment.findMany({
    where: {
      driverId: session.userId,
      status: "DELIVERED",
      deliveredAt: { gte: startOfToday, lt: startOfTomorrow },
    },
    orderBy: { deliveredAt: "desc" },
    include: { order: { select: { orderNumber: true, total: true, paymentMethodLabel: true } } },
  });

  const codDeliveries = deliveredToday.filter((a) => a.order.paymentMethodLabel === "Cash on Delivery");
  const nonCodDeliveries = deliveredToday.filter((a) => a.order.paymentMethodLabel !== "Cash on Delivery");
  const totalToHandOver = codDeliveries.reduce((sum, a) => sum + Number(a.order.total), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("description")}</p>
      </div>

      <Card className="p-4">
        <p className="text-sm text-ink-muted">{t("totalToHandOver")}</p>
        <p className="font-heading text-3xl font-semibold text-ink">
          <Money value={totalToHandOver} locale={locale} />
        </p>
      </Card>

      {codDeliveries.length === 0 ? (
        <EmptyState title={t("noCodTitle")} description={t("noCodDescription")} />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">{t("codDeliveriesToday")}</p>
            <div className="flex flex-col divide-y divide-border">
              {codDeliveries.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-ink">{a.order.orderNumber}</p>
                    <p className="text-xs text-ink-muted">
                      {a.deliveredAt && <FormattedDate date={a.deliveredAt} locale={locale} opts={{ timeStyle: "short" }} />}
                    </p>
                  </div>
                  <span className="font-medium text-ink">
                    <Money value={Number(a.order.total)} locale={locale} />
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {nonCodDeliveries.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">{t("nonCodHeading")}</p>
            <div className="flex flex-col divide-y divide-border">
              {nonCodDeliveries.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-ink">{a.order.orderNumber}</p>
                    <p className="text-xs text-ink-muted">
                      {a.deliveredAt && <FormattedDate date={a.deliveredAt} locale={locale} opts={{ timeStyle: "short" }} />}
                    </p>
                  </div>
                  <span className="text-xs text-ink-muted">{t("nonCodNote")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
