import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLogo } from "@/components/BrandLogo";
import { AccountNav } from "./AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account");
  const [user, unreadNotifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { firstName: true } }),
    prisma.notification.count({ where: { userId: session.userId, channel: "IN_APP", isRead: false } }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div>
          <Link href="/" aria-label="Betolla Cosmetics home">
            <BrandLogo priority className="mb-1 h-7 w-24" />
          </Link>
          <h1 className="font-heading text-lg font-semibold text-ink">{t("layout.title")}</h1>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <p className="hidden text-sm text-ink-muted lg:block">{t("layout.welcome", { name: user.firstName })}</p>
          <LanguageSwitcher />
          <ThemeToggle allowPlainDark={false} />
          <div className="hidden sm:block"><LogoutButton /></div>
        </div>
      </header>
      <div className="flex flex-1 flex-col sm:flex-row">
        <AccountNav unreadNotifications={unreadNotifications} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
