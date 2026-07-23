import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { DeliverySupportFilters } from "@/components/delivery-support/DeliverySupportFilters";
import { DeliverySupportList } from "@/components/delivery-support/DeliverySupportList";
import type { Prisma, TicketStatus, DeliveryProblemType } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Delivery Support - Betolla Admin" };

export default async function AdminDeliverySupportPage({
  searchParams,
}: {
  searchParams: Promise<{ driverId?: string; problemType?: string; status?: string; from?: string; to?: string }>;
}) {
  const { driverId, problemType, status, from, to } = await searchParams;
  const t = await getTranslations("admin.deliverySupport");

  const where: Prisma.DeliverySupportTicketWhereInput = {};
  if (driverId) where.driverId = driverId;
  if (problemType) where.problemType = problemType as DeliveryProblemType;
  if (status) where.status = status as TicketStatus;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
    };
  }

  const [reports, drivers] = await Promise.all([
    prisma.deliverySupportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        driver: { select: { firstName: true, lastName: true } },
        deliveryAssignment: { select: { order: { select: { orderNumber: true } } } },
      },
    }),
    prisma.user.findMany({ where: { role: "DELIVERY" }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      <DeliverySupportFilters drivers={drivers.map((d) => ({ id: d.id, name: `${d.firstName} ${d.lastName}` }))} />
      <DeliverySupportList reports={reports} basePath="/admin/delivery-support" />
    </div>
  );
}
