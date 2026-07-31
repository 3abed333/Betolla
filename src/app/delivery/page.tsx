import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { DeliveryStatusBadge } from "@/components/DeliveryStatusBadge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("delivery.active");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function ActiveDeliveriesPage() {
  const session = await requireRole("DELIVERY");
  const t = await getTranslations("delivery.active");
  const tItemCount = await getTranslations("account.orders");

  const assignments = await prisma.deliveryAssignment.findMany({
    where: { driverId: session.userId, status: { in: ["ASSIGNED", "PICKED_UP", "EN_ROUTE"] } },
    orderBy: { assignedAt: "asc" },
    include: {
      order: {
        select: {
          orderNumber: true,
          shippingAddressSnapshot: true,
          user: { select: { firstName: true, lastName: true, phone: true } },
          items: { select: { id: true } },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>

      {assignments.length === 0 ? (
        <EmptyState title={t("noActiveTitle")} description={t("noActiveDescription")} />
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => (
            <Link key={a.id} href={`/delivery/${a.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{a.order.orderNumber}</p>
                    <p className="text-sm text-ink-muted">
                      {a.order.user.firstName} {a.order.user.lastName} &middot;{" "}
                      {tItemCount("itemCount", { count: a.order.items.length })}
                    </p>
                    <p className="text-xs text-ink-muted">{a.order.shippingAddressSnapshot}</p>
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
