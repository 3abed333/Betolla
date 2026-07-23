import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, Badge } from "@/components/ui";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";
import { getLowStockProducts } from "@/lib/server/services/inventory";

export default async function AdminHomePage() {
  const t = await getTranslations("admin.home");
  const locale = (await getLocale()) as AppLocale;
  const [pendingOrders, lowStockProducts, openTickets, openDeliveryReports, totalRevenue, customerCount] =
    await Promise.all([
      prisma.order.count({ where: { status: "PENDING" } }),
      getLowStockProducts(),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.deliverySupportTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);
  const lowStockCount = lowStockProducts.length;

  const tiles = [
    { label: t("tiles.pendingOrders"), value: pendingOrders, href: "/admin/orders?status=PENDING" },
    { label: t("tiles.lowOutOfStock"), value: lowStockCount, href: "/admin/products?filter=low-stock" },
    { label: t("tiles.openSupportTickets"), value: openTickets, href: "/admin/support" },
    { label: t("tiles.openDeliveryReports"), value: openDeliveryReports, href: "/admin/delivery-support" },
    {
      label: t("tiles.totalRevenue"),
      value: <Money value={Number(totalRevenue._sum.total ?? 0)} locale={locale} />,
      href: "/admin/analytics",
    },
    { label: t("tiles.customers"), value: customerCount, href: "/admin/users" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
      <Card>
        <CardContent>
          <p className="text-sm text-ink-muted">
            {t.rich("analyticsNote", { badge: (chunks) => <Badge variant="neutral">{chunks}</Badge> })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
