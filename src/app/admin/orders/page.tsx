import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { Button } from "@/components/ui";
import type { Prisma, OrderStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Orders - Betolla Admin" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const t = await getTranslations("admin.orders");
  const tCommon = await getTranslations("common");

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
    include: { user: { select: { firstName: true, lastName: true } }, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const exportParams = new URLSearchParams();
  if (status) exportParams.set("status", status);
  if (q) exportParams.set("q", q);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <Button size="sm" variant="outline" asChild>
          <a href={`/api/admin/orders/export?${exportParams.toString()}`}>{tCommon("exportCsv")}</a>
        </Button>
      </div>
      <OrderFilters />
      <OrdersTable
        basePath="/admin/orders"
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          total: o.total.toString(),
          createdAt: o.createdAt,
          customerName: `${o.user.firstName} ${o.user.lastName}`,
          itemCount: o.items.length,
        }))}
      />
    </div>
  );
}
