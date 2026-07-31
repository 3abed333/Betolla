import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import { ReturnActions } from "./ReturnActions";
import { resolveOrderItemName } from "@/lib/orderItemName";
import type { AppLocale } from "@/i18n/config";

export default async function AdminReturnsPage() {
  const t = await getTranslations("admin.returns");
  const locale = (await getLocale()) as AppLocale;
  const requests = await prisma.returnRequest.findMany({
    include: {
      order: { select: { orderNumber: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
      items: {
        include: {
          orderItem: {
            include: {
              product: { select: { nameEn: true, nameAr: true } },
              bundle: { select: { nameEn: true, nameAr: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const labels = {
    APPROVED: t("actions.approve"),
    REJECTED: t("actions.reject"),
    RECEIVED: t("actions.received"),
    REFUNDED: t("actions.refund"),
    error: t("actions.error"),
  };
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("title")}</h2>
        <p className="text-sm text-ink-muted">{t("description")}</p>
      </div>
      {requests.length === 0 ? <EmptyState title={t("empty")} /> : requests.map((request) => {
        const value = request.items.reduce(
          (sum, item) => sum + Number(item.orderItem.priceSnapshot) * item.quantity,
          0,
        );
        return (
          <Card key={request.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{request.order.orderNumber} · {request.user.firstName} {request.user.lastName}</p>
                  <p className="text-xs text-ink-muted">{request.user.email}</p>
                </div>
                <Badge variant="neutral">{t(`status.${request.status}`)}</Badge>
              </div>
              {request.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-surface-secondary p-3 text-sm">
                  <p className="font-medium text-ink">{resolveOrderItemName(item.orderItem, locale)} × {item.quantity}</p>
                  <p className="text-ink-muted">{item.reason}{item.reasonNote ? ` — ${item.reasonNote}` : ""}</p>
                </div>
              ))}
              <p className="text-sm text-ink">{t("refundValue")}: <Money value={value} locale={locale} /></p>
              <ReturnActions id={request.id} status={request.status} labels={labels} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
