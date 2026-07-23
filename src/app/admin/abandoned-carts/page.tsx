import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import type { AppLocale } from "@/i18n/config";
import { RemindButton } from "./RemindButton";

export const metadata: Metadata = { title: "Abandoned Carts - Betolla Admin" };

export default async function AbandonedCartsPage() {
  const t = await getTranslations("admin.abandonedCarts");
  const locale = (await getLocale()) as AppLocale;
  const carts = await prisma.cart.findMany({
    where: { status: "ABANDONED" },
    orderBy: { lastActivityAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      items: { include: { product: { select: { nameEn: true } }, bundle: { select: { nameEn: true } } } },
    },
  });
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <p className="text-sm text-ink-muted">{t("summary", { count: carts.length })}</p>
      </div>

      {carts.length === 0 ? (
        <EmptyState title={t("noCartsTitle")} description={t("noCartsDescription")} />
      ) : (
        <div className="flex flex-col gap-3">
          {carts.map((cart) => {
            const total = cart.items.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);
            const daysAgo = Math.floor((now.getTime() - cart.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <Card key={cart.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink">
                        {cart.user.firstName} {cart.user.lastName}
                      </p>
                      <p className="text-sm text-ink-muted">{cart.user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <p className="font-medium text-ink">
                          <Money value={total} locale={locale} />
                        </p>
                        <p className="text-xs text-ink-muted">{t("lastActivity", { days: daysAgo })}</p>
                      </div>
                      <RemindButton cartId={cart.id} />
                    </div>
                  </div>
                  <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm text-ink-muted">
                    {cart.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity} &times; {item.product?.nameEn ?? item.bundle?.nameEn ?? t("unknownItem")} &middot;{" "}
                        <Money value={Number(item.priceAtAdd) * item.quantity} locale={locale} />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
