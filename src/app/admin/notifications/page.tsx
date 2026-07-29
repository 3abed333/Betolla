import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import type { AppLocale } from "@/i18n/config";

export const metadata: Metadata = { title: "Notifications - Betolla Admin" };

export default async function AdminNotificationsPage() {
  const session = await requireRole("ADMIN");
  const t = await getTranslations("common.notifications");
  const locale = (await getLocale()) as AppLocale;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      <NotificationsList notifications={notifications} locale={locale} orderHrefBase="/admin/orders" />
    </div>
  );
}
