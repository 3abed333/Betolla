import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { OrderStatusActions } from "@/components/orders/OrderStatusActions";
import { NoDriverAlert } from "@/components/orders/NoDriverAlert";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

export const metadata: Metadata = { title: "Order Details - Betolla Staff" };

export default async function StaffOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [order, drivers] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        user: { select: { firstName: true, lastName: true } },
        deliveryAssignments: { orderBy: { assignedAt: "desc" }, include: { driver: { select: { firstName: true, lastName: true } } } },
        promoCode: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "DELIVERY", isActive: true },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  if (!order) notFound();

  const t = await getTranslations("admin.orders.detail");
  const tPayment = await getTranslations("common.paymentStatus");
  const tDeliveryStatus = await getTranslations("common.deliveryStatus");
  const locale = (await getLocale()) as AppLocale;
  const needsDriverAlert =
    (order.status === "CONFIRMED" || order.status === "ON_DELIVERY") &&
    !order.deliveryAssignments.some((da) => da.status !== "FAILED");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ink">{t("orderPrefix", { orderNumber: order.orderNumber })}</h2>
          <p className="text-sm text-ink-muted">
            {order.user.firstName} {order.user.lastName} &middot;{" "}
            <FormattedDate date={order.createdAt} locale={locale} opts={{ dateStyle: "long", timeStyle: "short" }} />
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {needsDriverAlert && <NoDriverAlert />}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <OrderTracker status={order.status} history={order.statusHistory} />
          <OrderStatusActions
            orderId={order.id}
            status={order.status}
            drivers={drivers}
            hasActiveAssignment={order.deliveryAssignments.some((da) => da.status !== "FAILED")}
          />
        </CardContent>
      </Card>

      {order.deliveryAssignments.length > 0 && (
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-ink">{t("deliveryHistory")}</p>
            <div className="mt-2 flex flex-col gap-2">
              {order.deliveryAssignments.map((da) => (
                <p key={da.id} className="text-sm text-ink-muted">
                  {t("attemptPrefix", { n: da.attemptNumber, driverName: `${da.driver.firstName} ${da.driver.lastName}` })}{" "}
                  {tDeliveryStatus(da.status)}
                  {da.failedReason && ` (${da.failedReason})`}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                <Image src={item.imageSnapshot} alt={item.nameSnapshot} fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink">{item.nameSnapshot}</p>
                <p className="text-sm text-ink-muted">
                  {t("qty")} {item.quantity} &middot; <Money value={Number(item.priceSnapshot)} locale={locale} /> {t("each")}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>{t("subtotal")}</span>
            <span>
              <Money value={Number(order.subtotal)} locale={locale} />
            </span>
          </div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>
                {t("discount")} {order.promoCode && `(${order.promoCode.code})`}
              </span>
              <span>
                -<Money value={Number(order.discountTotal)} locale={locale} />
              </span>
            </div>
          )}
          {Number(order.storeCreditUsed) > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>{t("storeCreditApplied")}</span>
              <span>
                -<Money value={Number(order.storeCreditUsed)} locale={locale} />
              </span>
            </div>
          )}
          {Number(order.loyaltyRedemptionValue) > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>{t("loyaltyPointsRedeemed")}</span>
              <span>
                -<Money value={Number(order.loyaltyRedemptionValue)} locale={locale} />
              </span>
            </div>
          )}
          <div className="flex justify-between text-ink-muted">
            <span>{t("shipping")}</span>
            <span>
              <Money value={Number(order.shippingFee)} locale={locale} />
            </span>
          </div>
          <div className="flex justify-between font-semibold text-ink">
            <span>{t("total")}</span>
            <span>
              <Money value={Number(order.total)} locale={locale} />
            </span>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {t("paymentPrefix")} {order.paymentMethodLabel} ({tPayment(order.paymentStatus)}) &middot; {t("shipToPrefix")}{" "}
            {order.shippingAddressSnapshot}
          </p>
          {order.shippingRecipientPhone && (
            <p className="text-xs text-ink-muted">
              {t("recipientPhonePrefix")}{" "}
              <span dir="ltr" className="inline-block">
                {order.shippingRecipientPhone}
              </span>
            </p>
          )}
          {order.shippingDeliveryNotes && (
            <p className="text-xs text-ink-muted">
              {t("deliveryNotesPrefix")} {order.shippingDeliveryNotes}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
