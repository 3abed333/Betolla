import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLogo } from "@/components/BrandLogo";
import { DeliveryNav } from "./DeliveryNav";

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("DELIVERY");
  const [user, unreadNotifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { firstName: true } }),
    prisma.notification.count({ where: { userId: session.userId, channel: "IN_APP", isRead: false } }),
  ]);
  const t = await getTranslations("delivery.layout");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <BrandLogo priority className="mb-1 h-7 w-24" />
          <h1 className="font-heading text-lg font-semibold text-ink">{t("heading")}</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end sm:gap-4">
          <p className="w-full truncate text-sm text-ink-muted sm:w-auto">{t("welcome", { name: user.firstName })}</p>
          <LanguageSwitcher />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1 flex-col sm:flex-row">
        <DeliveryNav unreadNotifications={unreadNotifications} />
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </div>
  );
}
