"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, EmptyState, Badge, Button, Tabs, TabsList, TabsTrigger } from "@/components/ui";
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
  const tErrors = useTranslations("errors");
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

      {hasUnread && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={markAllRead} disabled={isPending}>
            {t("markAllRead")}
          </Button>
        </div>
      )}

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
                <p className="mt-1 font-medium text-ink">{n.title}</p>
                <p className="text-sm text-ink-muted">{n.body}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  <FormattedDate date={n.createdAt} locale={locale} opts={{ dateStyle: "medium", timeStyle: "short" }} />
                </p>
                {orderHrefBase && n.relatedOrderId && (
                  <Link href={`${orderHrefBase}/${n.relatedOrderId}`} className="text-sm text-cta hover:underline">
                    {t("viewOrder")}
                  </Link>
                )}
              </div>
              {!n.isRead && (
                <Button size="sm" variant="outline" onClick={() => markRead(n.id)} disabled={isPending}>
                  {t("markRead")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
