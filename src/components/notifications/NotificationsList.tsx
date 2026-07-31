"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  EmptyState,
  Badge,
  Button,
  ConfirmDialog,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { NavBadge } from "@/components/NavBadge";
import { FormattedDate } from "@/components/FormattedDate";
import { toast } from "@/lib/toast";
import type { AppLocale } from "@/i18n/config";

// Real NotificationCategory enum values (prisma/schema.prisma) - kept as a stable identifier list
// here rather than derived from the data, so a category with zero notifications for this user
// still doesn't appear as a filter tab (only categories actually present do, see presentCategories
// below), while the order stays consistent with the schema/common.notificationCategory catalog.
const ALL_CATEGORIES = [
  "ORDER_UPDATES",
  "PROMOTIONS",
  "BACK_IN_STOCK",
  "LOYALTY_AND_WALLET",
  "SUPPORT",
  "DELIVERY_ASSIGNMENTS",
  "OPERATIONS",
] as const;

type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  titleKey: string | null;
  bodyKey: string | null;
  // Prisma types a Json column as JsonValue (string | number | boolean | null | JsonObject |
  // JsonArray) - every call site that writes it always passes a flat Record<string, string |
  // number>, so it's narrowed to that shape at the one place it's read (resolveParams below)
  // rather than fighting Prisma's wider type through every page that fetches a Notification row.
  params: unknown;
  isRead: boolean;
  createdAt: Date;
  relatedOrderId: string | null;
};

export function NotificationsList({
  notifications,
  locale,
  orderHrefBase,
}: {
  notifications: NotificationRow[];
  locale: AppLocale;
  orderHrefBase?: string;
}) {
  const router = useRouter();
  const t = useTranslations("common.notifications");
  const tCategory = useTranslations("common.notificationCategory");
  const tEvents = useTranslations("common.notificationEvents");
  const tErrors = useTranslations("errors");

  // A few event templates (low stock, price drop, back in stock) carry both productNameEn and
  // productNameAr in params so the product name itself renders in the viewer's own locale too,
  // not just the surrounding sentence - resolve that pair down to one `productName` param here.
  function resolveParams(raw: unknown): Record<string, string | number> | undefined {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const params = raw as Record<string, string | number>;
    if (!("productNameEn" in params)) return params;
    const { productNameEn, productNameAr, ...rest } = params;
    return { ...rest, productName: (locale === "ar" && productNameAr ? productNameAr : productNameEn) as string };
  }

  function renderTitle(n: NotificationRow) {
    if (n.titleKey && tEvents.has(n.titleKey)) return tEvents(n.titleKey, resolveParams(n.params));
    return n.title;
  }

  function renderBody(n: NotificationRow) {
    if (n.bodyKey && tEvents.has(n.bodyKey)) return tEvents(n.bodyKey, resolveParams(n.params));
    return n.body;
  }
  const [isPending, startTransition] = useTransition();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const presentCategories = useMemo(
    () => ALL_CATEGORIES.filter((c) => notifications.some((n) => n.category === c)),
    [notifications],
  );
  const unreadCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notifications) {
      if (!n.isRead) counts.set(n.category, (counts.get(n.category) ?? 0) + 1);
    }
    return counts;
  }, [notifications]);
  const totalUnread = notifications.filter((n) => !n.isRead).length;
  const hasUnread = totalUnread > 0;

  const visible = selectedCategory === "ALL" ? notifications : notifications.filter((n) => n.category === selectedCategory);

  function markRead(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) {
        toast.error(tErrors("genericTryAgain"));
        return;
      }
      router.refresh();
    });
  }

  function markAllRead() {
    startTransition(async () => {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) {
        toast.error(tErrors("genericTryAgain"));
        return;
      }
      router.refresh();
    });
  }

  async function deleteNotification(id: string) {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(tErrors("genericTryAgain"));
      return;
    }
    router.refresh();
  }

  async function deleteAllNotifications() {
    const res = await fetch("/api/notifications", { method: "DELETE" });
    if (!res.ok) {
      toast.error(tErrors("genericTryAgain"));
      return;
    }
    router.refresh();
  }

  if (notifications.length === 0) {
    return <EmptyState title={t("noNotificationsTitle")} description={t("noNotificationsDescription")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ALL">
            {t("allCategories")}
            <NavBadge count={totalUnread} />
          </TabsTrigger>
          {presentCategories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {tCategory(category)}
              <NavBadge count={unreadCountByCategory.get(category) ?? 0} />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap justify-end gap-2">
        {hasUnread && (
          <Button size="sm" variant="outline" onClick={markAllRead} disabled={isPending}>
            {t("markAllRead")}
          </Button>
        )}
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="destructive" disabled={isPending}>
              {t("deleteAll")}
            </Button>
          }
          title={t("deleteAllTitle")}
          description={t("deleteAllDescription")}
          confirmLabel={t("deleteAll")}
          onConfirm={deleteAllNotifications}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title={t("noNotificationsTitle")} description={t("noNotificationsDescription")} />
      ) : (
        visible.map((n) => (
          <Card key={n.id} className={n.isRead ? undefined : "border-cta"}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {!n.isRead && <Badge variant="accent">{t("unread")}</Badge>}
                  <Badge variant="neutral">{tCategory.has(n.category) ? tCategory(n.category) : n.category}</Badge>
                </div>
                <p className="mt-1 font-medium text-ink">{renderTitle(n)}</p>
                <p className="text-sm text-ink-muted">{renderBody(n)}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  <FormattedDate date={n.createdAt} locale={locale} opts={{ dateStyle: "medium", timeStyle: "short" }} />
                </p>
                {orderHrefBase && n.relatedOrderId && (
                  <Link href={`${orderHrefBase}/${n.relatedOrderId}`} className="text-sm text-cta hover:underline">
                    {t("viewOrder")}
                  </Link>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {!n.isRead && (
                  <Button size="sm" variant="outline" onClick={() => markRead(n.id)} disabled={isPending}>
                    {t("markRead")}
                  </Button>
                )}
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="destructive" disabled={isPending}>
                      {t("delete")}
                    </Button>
                  }
                  title={t("deleteTitle")}
                  description={t("deleteDescription")}
                  confirmLabel={t("delete")}
                  onConfirm={() => deleteNotification(n.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
