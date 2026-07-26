import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole, assertOwnership } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { DeliveryStatusBadge } from "@/components/DeliveryStatusBadge";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";
import { ReorderButton } from "../ReorderButton";
import { ReturnRequestDialog } from "../ReturnRequestDialog";
import { WriteOrderItemReviewDialog } from "./WriteOrderItemReviewDialog";
import { WriteDeliveryRatingDialog } from "./WriteDeliveryRatingDialog";

export const metadata: Metadata = { title: "Order Details - Betolla Cosmetics" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account.orders.detail");
  const locale = (await getLocale()) as AppLocale;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          returnItems: true,
          product: { select: { nameEn: true, nameAr: true } },
          bundle: { select: { nameEn: true, nameAr: true } },
          reviews: { where: { userId: session.userId }, select: { id: true } },
        },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
      deliveryAssignments: { orderBy: { assignedAt: "desc" }, take: 1, include: { driver: true } },
    },
  });
  if (!order) notFound();
  assertOwnership(session, order.userId);

  const latestDelivery = order.deliveryAssignments[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ink">{t("orderPrefix", { orderNumber: order.orderNumber })}</h2>
          <p className="text-sm text-ink-muted">
            {t("placedPrefix")} <FormattedDate date={order.createdAt} locale={locale} opts={{ dateStyle: "long" }} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          {order.status === "DELIVERED" && <ReorderButton orderId={order.id} />}
        </div>
      </div>

      <Card>
        <CardContent>
          <OrderTracker status={order.status} history={order.statusHistory} />
        </CardContent>
      </Card>

      {latestDelivery && order.status !== "PENDING" && (
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-ink">{t("delivery")}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <span>{latestDelivery.driver.firstName} {latestDelivery.driver.lastName}</span>
              <DeliveryStatusBadge status={latestDelivery.status} />
              {latestDelivery.failedReason && <span>({latestDelivery.failedReason})</span>}
            </div>
            {latestDelivery.status === "DELIVERED" && (
              latestDelivery.rating !== null ? (
                <div className="mt-2">
                  <StarRatingDisplay rating={latestDelivery.rating} />
                </div>
              ) : (
                <div className="mt-2">
                  <WriteDeliveryRatingDialog deliveryAssignmentId={latestDelivery.id} />
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col divide-y divide-border">
          {order.items.map((item) => {
            const itemName = item.product
              ? localizedField(locale, item.product.nameEn, item.product.nameAr)
              : item.bundle
                ? localizedField(locale, item.bundle.nameEn, item.bundle.nameAr)
                : item.nameSnapshot;
            return (
            <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                <Image src={item.imageSnapshot} alt={itemName} fill sizes="64px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink">{itemName}</p>
                <p className="text-sm text-ink-muted">
                  {t("qty")} {item.quantity} &middot; <Money value={Number(item.priceSnapshot)} locale={locale} /> {t("each")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {order.status === "DELIVERED" &&
                  (item.returnItems.length > 0 ? (
                    <Badge variant="neutral">{t("returnRequested")}</Badge>
                  ) : (
                    <ReturnRequestDialog
                      orderId={order.id}
                      orderItemId={item.id}
                      itemName={itemName}
                      maxQuantity={item.quantity}
                    />
                  ))}
                {/* Reviews are product-scoped, not bundle-scoped - a bundle line item has no
                    productId, so it isn't reviewable here (see the review service's own
                    productId requirement). */}
                {order.status === "DELIVERED" && item.productId && item.reviews.length === 0 && (
                  <WriteOrderItemReviewDialog orderItemId={item.id} itemName={itemName} />
                )}
              </div>
            </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>{t("subtotal")}</span>
            <span><Money value={Number(order.subtotal)} locale={locale} /></span>
          </div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>{t("discount")}</span>
              <span>-<Money value={Number(order.discountTotal)} locale={locale} /></span>
            </div>
          )}
          {Number(order.storeCreditUsed) > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>{t("storeCreditApplied")}</span>
              <span>-<Money value={Number(order.storeCreditUsed)} locale={locale} /></span>
            </div>
          )}
          {Number(order.loyaltyRedemptionValue) > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>{t("loyaltyPointsRedeemed")}</span>
              <span>-<Money value={Number(order.loyaltyRedemptionValue)} locale={locale} /></span>
            </div>
          )}
          <div className="flex justify-between text-ink-muted">
            <span>{t("shipping")}</span>
            <span><Money value={Number(order.shippingFee)} locale={locale} /></span>
          </div>
          <div className="flex justify-between font-semibold text-ink">
            <span>{t("total")}</span>
            <span><Money value={Number(order.total)} locale={locale} /></span>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {t("shippingToPrefix")} {order.shippingAddressSnapshot} &middot; {t("paymentPrefix")} {order.paymentMethodLabel}
          </p>
          {order.cancellationReason && (
            <p className="mt-1 text-xs text-red-600">{t("cancellationReasonPrefix")} {order.cancellationReason}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
