import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Money } from "@/components/Money";
import { FormattedDate } from "@/components/FormattedDate";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export const metadata: Metadata = { title: "Wallet & Loyalty - Betolla Cosmetics" };

export default async function WalletPage() {
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account.wallet");
  const locale = (await getLocale()) as AppLocale;

  const [user, storeCreditTx, loyaltyTx, tiers] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { storeCreditBalance: true, loyaltyPointsBalance: true },
    }),
    prisma.storeCreditTransaction.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.loyaltyTransaction.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.loyaltyTier.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const balance = user.loyaltyPointsBalance;
  const currentTierIndex = [...tiers].reverse().findIndex((t) => balance >= t.minPoints);
  const currentTier = currentTierIndex >= 0 ? [...tiers].reverse()[currentTierIndex] : undefined;
  const nextTier = tiers.find((t) => t.minPoints > balance);
  const progressPct = nextTier
    ? Math.min(100, Math.round(((balance - (currentTier?.minPoints ?? 0)) / (nextTier.minPoints - (currentTier?.minPoints ?? 0))) * 100))
    : 100;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("storeCreditTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-ink">
              <Money value={Number(user.storeCreditBalance)} locale={locale} />
            </p>
            <p className="mt-1 text-sm text-ink-muted">{t("autoAppliedNote")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("loyaltyPointsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-ink">{t("pts", { count: balance })}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {currentTier
                ? t("tierSuffix", { tier: localizedField(locale, currentTier.nameEn, currentTier.nameAr) })
                : t("bronzeTierFallback")}
              {nextTier &&
                ` – ${t("pointsToNextTier", { count: nextTier.minPoints - balance, tier: localizedField(locale, nextTier.nameEn, nextTier.nameAr) })}`}
            </p>
            {nextTier && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
                <div className="h-full rounded-full bg-cta" style={{ width: `${progressPct}%` }} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("storeCreditHistoryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {storeCreditTx.length === 0 && <p className="text-sm text-ink-muted">{t("noTransactions")}</p>}
            {storeCreditTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-ink">{tx.reason}</p>
                  <p className="text-xs text-ink-muted">
                    <FormattedDate date={tx.createdAt} locale={locale} />
                  </p>
                </div>
                <span className={Number(tx.amount) >= 0 ? "text-success" : "text-ink"}>
                  {Number(tx.amount) >= 0 ? "+" : ""}
                  <Money value={Number(tx.amount)} locale={locale} />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("loyaltyHistoryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {loyaltyTx.length === 0 && <p className="text-sm text-ink-muted">{t("noTransactions")}</p>}
            {loyaltyTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-ink">
                    {tx.type === "EARN" ? t("txType.earned") : tx.type === "REDEEM" ? t("txType.redeemed") : t("txType.adjusted")}
                  </p>
                  <p className="text-xs text-ink-muted">
                    <FormattedDate date={tx.createdAt} locale={locale} />
                  </p>
                </div>
                <span className={tx.points >= 0 ? "text-success" : "text-ink"}>
                  {tx.points >= 0 ? "+" : ""}
                  {t("pts", { count: tx.points })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
