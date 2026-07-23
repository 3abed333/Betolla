import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { DeliveryStatusBadge } from "@/components/DeliveryStatusBadge";

export const metadata: Metadata = { title: "Delivery History - Betolla Delivery" };

export default async function DeliveryHistoryPage() {
  const session = await requireRole("DELIVERY");
  const t = await getTranslations("delivery.history");

  const assignments = await prisma.deliveryAssignment.findMany({
    where: { driverId: session.userId, status: { in: ["DELIVERED", "FAILED"] } },
    orderBy: { assignedAt: "desc" },
    take: 100,
    include: { order: { select: { orderNumber: true, shippingAddressSnapshot: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>

      {assignments.length === 0 ? (
        <EmptyState title={t("noPastTitle")} description={t("noPastDescription")} />
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => (
            <Link key={a.id} href={`/delivery/${a.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{a.order.orderNumber}</p>
                    <p className="text-xs text-ink-muted">{a.order.shippingAddressSnapshot}</p>
                    {a.status === "FAILED" && a.failedReason && (
                      <p className="mt-1 text-xs text-red-600">{a.failedReason}</p>
                    )}
                  </div>
                  <DeliveryStatusBadge status={a.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
