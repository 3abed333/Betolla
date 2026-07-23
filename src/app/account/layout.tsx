import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountNav } from "./AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { firstName: true },
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <Link href="/" className="text-xs tracking-widest text-ink-muted uppercase hover:text-ink">
            Betolla
          </Link>
          <h1 className="font-heading text-lg font-semibold text-ink">{t("layout.title")}</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-ink-muted">{t("layout.welcome", { name: user.firstName })}</p>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1 flex-col sm:flex-row">
        <AccountNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
