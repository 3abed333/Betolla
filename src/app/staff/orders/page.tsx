import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrderFilters } from "@/components/orders/OrderFilters";
import type { Prisma, OrderStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Orders - Betolla Staff" };

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const t = await getTranslations("admin.orders");

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status as OrderStatus;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { user: { firstName: { contains: q, mode: "insensitive" } } },
      { user: { lastName: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true } },
      items: true,
      deliveryAssignments: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      <OrderFilters />
      <OrdersTable
        basePath="/staff/orders"
        orders={orders
          .map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            paymentStatus: o.paymentStatus,
            total: o.total.toString(),
            createdAt: o.createdAt,
            customerName: `${o.user.firstName} ${o.user.lastName}`,
            itemCount: o.items.length,
            isGift: o.isGift,
            needsDriver:
              (o.status === "CONFIRMED" || o.status === "ON_DELIVERY") &&
              !o.deliveryAssignments.some((da) => da.status !== "FAILED"),
          }))
          // See admin/orders/page.tsx for why: needs-driver orders float to the top so they
          // can never be pushed out of the render cap by older history.
          .sort((a, b) => Number(b.needsDriver) - Number(a.needsDriver))
          .slice(0, 100)}
      />
    </div>
  );
}
