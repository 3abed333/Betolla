import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState, Badge } from "@/components/ui";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { ReorderButton } from "./ReorderButton";

export const metadata: Metadata = { title: "My Orders - Betolla Cosmetics" };

export default async function OrdersPage() {
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account.orders");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;
  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    return <EmptyState title={t("noOrdersTitle")} description={t("noOrdersDescription")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/account/orders/${order.id}`} className="font-medium text-ink hover:underline">
                  {order.orderNumber}
                </Link>
                <OrderStatusBadge status={order.status} />
                {order.paymentStatus === "UNPAID" && <Badge variant="neutral">{t("unpaid")}</Badge>}
                {order.paymentStatus === "REFUNDED" && <Badge variant="accent">{t("refunded")}</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                <FormattedDate date={order.createdAt} locale={locale} /> &middot;{" "}
                {t("itemCount", { count: order.items.length })} &middot; <Money value={Number(order.total)} locale={locale} />
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/account/orders/${order.id}`}
                className="rounded-full border border-border px-4 py-2 text-sm text-ink hover:bg-surface-secondary"
              >
                {tCommon("viewDetails")}
              </Link>
              {order.status === "DELIVERED" && <ReorderButton orderId={order.id} />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
