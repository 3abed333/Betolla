import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui";
import { StoreCreditAdjustmentForm } from "@/components/StoreCreditAdjustmentForm";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { localizedCity } from "@/lib/cityAr";

export const metadata: Metadata = { title: "Customer - Betolla Admin" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      storeCreditBalance: true,
      loyaltyPointsBalance: true,
      customerStats: true,
    },
  });
  if (!customer || customer.role !== "CUSTOMER") notFound();

  const t = await getTranslations("admin.users.detail");
  const tCommon = await getTranslations("common");
  const tSegment = await getTranslations("common.rfmSegment");
  const tPayment = await getTranslations("common.paymentStatus");
  const tWallet = await getTranslations("account.wallet");
  const locale = (await getLocale()) as AppLocale;

  const [orders, addresses, storeCreditTx, loyaltyTx] = await Promise.all([
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, createdAt: true },
    }),
    prisma.address.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" } }),
    prisma.storeCreditTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.loyaltyTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-2xl font-semibold text-ink">
            {customer.firstName} {customer.lastName}
          </h2>
          <Badge variant={customer.isActive ? "success" : "neutral"}>
            {customer.isActive ? tCommon("active") : tCommon("inactive")}
          </Badge>
          {customer.customerStats?.segment && <Badge variant="highlight">{tSegment(customer.customerStats.segment)}</Badge>}
        </div>
        <p className="text-sm text-ink-muted">
          {customer.email} &middot; {customer.username} &middot;{" "}
          <span dir="ltr" className="inline-block">
            {customer.phone ?? t("noPhoneOnFile")}
          </span>{" "}
          &middot; {t("joinedPrefix")} <FormattedDate date={customer.createdAt} locale={locale} opts={{ dateStyle: "long" }} />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("totalSpent")}</p>
          <p className="font-heading text-xl font-semibold text-ink">
            <Money value={Number(customer.customerStats?.totalSpent ?? 0)} locale={locale} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("orders")}</p>
          <p className="font-heading text-xl font-semibold text-ink">{customer.customerStats?.orderCount ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("storeCredit")}</p>
          <p className="font-heading text-xl font-semibold text-ink">
            <Money value={Number(customer.storeCreditBalance)} locale={locale} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">{t("loyaltyPoints")}</p>
          <p className="font-heading text-xl font-semibold text-ink">{customer.loyaltyPointsBalance}</p>
        </Card>
      </div>

      <StoreCreditAdjustmentForm userId={customer.id} />

      <div>
        <p className="mb-2 font-medium text-ink">{t("recentOrders")}</p>
        {orders.length === 0 ? (
          <EmptyState title={t("noOrdersYet")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orderHeaders.order")}</TableHead>
                <TableHead>{t("orderHeaders.status")}</TableHead>
                <TableHead>{t("orderHeaders.payment")}</TableHead>
                <TableHead>{t("orderHeaders.total")}</TableHead>
                <TableHead>{t("orderHeaders.placed")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/admin/orders/${order.id}`} className="text-cta hover:underline">
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{tPayment(order.paymentStatus)}</TableCell>
                  <TableCell>
                    <Money value={Number(order.total)} locale={locale} />
                  </TableCell>
                  <TableCell>
                    <FormattedDate date={order.createdAt} locale={locale} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 font-medium text-ink">{t("addresses")}</p>
          {addresses.length === 0 ? (
            <EmptyState title={t("noSavedAddresses")} />
          ) : (
            <div className="flex flex-col gap-2">
              {addresses.map((addr) => (
                <Card key={addr.id} className="p-3 text-sm">
                  <p className="font-medium text-ink">
                    {addr.label} {addr.isDefaultShipping && <Badge variant="highlight">{t("default")}</Badge>}
                  </p>
                  <p className="text-ink-muted">
                    {addr.recipientName} &middot;{" "}
                    <span dir="ltr" className="inline-block">
                      {addr.phone}
                    </span>
                  </p>
                  <p className="text-ink-muted">
                    {addr.street}, {addr.area}, {localizedCity(addr.city, locale)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 font-medium text-ink">{t("walletHistory")}</p>
          <Card>
            <CardContent className="flex flex-col divide-y divide-border">
              {storeCreditTx.length === 0 && loyaltyTx.length === 0 && (
                <p className="text-sm text-ink-muted">{t("noWalletActivity")}</p>
              )}
              {storeCreditTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-ink">{tx.reason}</p>
                    <p className="text-xs text-ink-muted">
                      <FormattedDate date={tx.createdAt} locale={locale} />
                    </p>
                  </div>
                  <span className={Number(tx.amount) >= 0 ? "text-success" : "text-ink"}>
                    {Number(tx.amount) >= 0 ? "+" : ""}
                    <Money value={Number(tx.amount)} locale={locale} />
                  </span>
                </div>
              ))}
              {loyaltyTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-ink">
                      {tx.note ?? (tx.type === "EARN" ? tWallet("txType.earned") : tx.type === "REDEEM" ? tWallet("txType.redeemed") : tWallet("txType.adjusted"))}
                    </p>
                    <p className="text-xs text-ink-muted">
                      <FormattedDate date={tx.createdAt} locale={locale} />
                    </p>
                  </div>
                  <span className={tx.points >= 0 ? "text-success" : "text-ink"}>
                    {tx.points >= 0 ? "+" : ""}
                    {tWallet("pts", { count: tx.points })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
