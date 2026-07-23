import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole, assertOwnership } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui";
import { DeliveryStatusBadge } from "@/components/DeliveryStatusBadge";
import { DeliveryStatusActions } from "@/components/DeliveryStatusActions";
import { DeliveryRouteMapLoader } from "@/components/DeliveryRouteMapLoader";
import { ReportProblemDialog } from "@/components/ReportProblemDialog";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";

export const metadata: Metadata = { title: "Delivery - Betolla Delivery" };

export default async function DeliveryAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("DELIVERY");
  const t = await getTranslations("delivery.detail");
  const tPayment = await getTranslations("common.paymentStatus");
  const locale = (await getLocale()) as AppLocale;

  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          items: true,
          user: { select: { firstName: true, lastName: true, phone: true } },
          shippingAddress: { select: { lat: true, lng: true } },
        },
      },
    },
  });
  if (!assignment) notFound();
  assertOwnership(session, assignment.driverId);

  const { order } = assignment;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ink">{order.orderNumber}</h2>
          <p className="text-sm text-ink-muted">
            {order.user.firstName} {order.user.lastName} &middot;{" "}
            <span dir="ltr" className="inline-block">
              {order.user.phone ?? t("noPhoneOnFile")}
            </span>
          </p>
        </div>
        <DeliveryStatusBadge status={assignment.status} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-ink">{order.shippingAddressSnapshot}</p>
          {order.shippingAddress?.lat != null && order.shippingAddress?.lng != null ? (
            <DeliveryRouteMapLoader lat={order.shippingAddress.lat} lng={order.shippingAddress.lng} />
          ) : (
            <p className="text-xs text-ink-muted">{t("noMapPin")}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <DeliveryStatusActions assignmentId={assignment.id} status={assignment.status} />
            <ReportProblemDialog deliveryAssignmentId={assignment.id} />
          </div>
        </CardContent>
      </Card>

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
                  {t("qty")} {item.quantity}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>{t("paymentMethod")}</span>
            <span>{order.paymentMethodLabel}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>{t("paymentStatus")}</span>
            <span>{tPayment(order.paymentStatus)}</span>
          </div>
          <div className="flex justify-between font-semibold text-ink">
            <span>{t("orderTotal")}</span>
            <span>
              <Money value={Number(order.total)} locale={locale} />
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
