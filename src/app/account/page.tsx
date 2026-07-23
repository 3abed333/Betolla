import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";

export default async function AccountHomePage() {
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account.overview");
  const locale = (await getLocale()) as AppLocale;

  const [user, activeOrderCount, wishlistCount, openTicketCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { loyaltyPointsBalance: true, storeCreditBalance: true },
    }),
    prisma.order.count({ where: { userId: session.userId, status: { in: ["PENDING", "CONFIRMED", "ON_DELIVERY"] } } }),
    prisma.wishlist.count({ where: { userId: session.userId } }),
    prisma.supportTicket.count({ where: { userId: session.userId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } } }),
  ]);

  const tiles = [
    { label: t("activeOrders"), value: activeOrderCount, href: "/account/orders" },
    { label: t("loyaltyPoints"), value: user.loyaltyPointsBalance, href: "/account/wallet" },
    { label: t("storeCredit"), value: <Money value={Number(user.storeCreditBalance)} locale={locale} />, href: "/account/wallet" },
    { label: t("wishlists"), value: wishlistCount, href: "/account/wishlists" },
    { label: t("openSupportTickets"), value: openTicketCount, href: "/account/support" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent>
                <p className="text-2xl font-semibold text-ink">{tile.value}</p>
                <p className="text-sm text-ink-muted">{tile.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
