import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { OrderStatusBadge } from "./OrderStatusBadge";

export type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: Date;
  customerName: string;
  itemCount: number;
  needsDriver?: boolean;
};

export async function OrdersTable({ orders, basePath }: { orders: OrderRow[]; basePath: string }) {
  const t = await getTranslations("admin.ordersShared");
  const tPayment = await getTranslations("common.paymentStatus");
  const locale = (await getLocale()) as AppLocale;

  if (orders.length === 0) {
    return <p className="p-6 text-center text-sm text-ink-muted">{t("noMatch")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("headers.order")}</TableHead>
          <TableHead>{t("headers.customer")}</TableHead>
          <TableHead>{t("headers.status")}</TableHead>
          <TableHead>{t("headers.payment")}</TableHead>
          <TableHead>{t("headers.items")}</TableHead>
          <TableHead>{t("headers.total")}</TableHead>
          <TableHead>{t("headers.date")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <Link href={`${basePath}/${order.id}`} className="font-medium text-ink hover:underline">
                {order.orderNumber}
              </Link>
            </TableCell>
            <TableCell>{order.customerName}</TableCell>
            <TableCell>
              <div className="flex flex-wrap items-center gap-1.5">
                <OrderStatusBadge status={order.status} />
                {order.needsDriver && <Badge variant="critical">{t("noDriverBadge")}</Badge>}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "REFUNDED" ? "accent" : "neutral"}>
                {tPayment(order.paymentStatus)}
              </Badge>
            </TableCell>
            <TableCell>{order.itemCount}</TableCell>
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
  );
}
