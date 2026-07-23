import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui";
import { getLowStockProducts } from "@/lib/server/services/inventory";

export default async function StaffHomePage() {
  const t = await getTranslations("staff.home");
  const [pendingOrders, lowStockProducts, unassignedOrders, openDeliveryReports] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    getLowStockProducts(),
    prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] }, deliveryAssignments: { none: {} } } }),
    prisma.deliverySupportTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
  ]);

  const tiles = [
    { label: t("tiles.pendingOrders"), value: pendingOrders, href: "/staff/orders?status=PENDING" },
    { label: t("tiles.lowOutOfStock"), value: lowStockProducts.length, href: "/staff/products?filter=low-stock" },
    { label: t("tiles.awaitingDriverAssignment"), value: unassignedOrders, href: "/staff/orders" },
    { label: t("tiles.openDeliveryReports"), value: openDeliveryReports, href: "/staff/delivery-support" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent>
                <p className="text-2xl font-semibold text-ink">{tile.value}</p>
                <p className="text-sm text-ink-muted">{tile.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
