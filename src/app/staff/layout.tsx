import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { StaffNav } from "./StaffNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STAFF");
  const [user, unreadNotifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { firstName: true } }),
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
  ]);
  const t = await getTranslations("staff.layout");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-xs tracking-widest text-ink-muted uppercase">{t("kicker")}</p>
          <h1 className="font-heading text-lg font-semibold text-ink">{t("heading")}</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-ink-muted">{t("welcome", { name: user.firstName })}</p>
          <LanguageSwitcher />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1 flex-col sm:flex-row">
        <StaffNav unreadNotifications={unreadNotifications} />
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </div>
  );
}
