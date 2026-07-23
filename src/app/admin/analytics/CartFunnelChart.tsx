import { getTranslations, getLocale } from "next-intl/server";
import { Money } from "@/components/Money";
import { formatCurrency } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";

type FunnelData = { stages: { key: string; count: number }[]; recoverableRevenue: number; abandonedCartCount: number };

export async function CartFunnelChart({ current, previous }: { current: FunnelData; previous?: FunnelData }) {
  const t = await getTranslations("admin.analytics.cartFunnel");
  const tAnalytics = await getTranslations("admin.analytics");
  const locale = (await getLocale()) as AppLocale;
  const maxCount = Math.max(1, ...current.stages.map((s) => s.count));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {current.stages.map((stage, i) => {
          const widthPercent = (stage.count / maxCount) * 100;
          const conversionFromPrevious = i > 0 && current.stages[i - 1].count > 0 ? (stage.count / current.stages[i - 1].count) * 100 : null;
          return (
            <div key={stage.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink">{t(`stages.${stage.key}`)}</span>
                <span className="text-ink-muted">
                  {stage.count}
                  {conversionFromPrevious !== null && ` ${t("conversionOfPrevious", { percent: conversionFromPrevious.toFixed(0) })}`}
                </span>
              </div>
              <div className="h-6 rounded-md bg-surface-secondary">
                <div className="h-6 rounded-md bg-cta" style={{ width: `${widthPercent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-muted">{t("footnote")}</p>
      <div className="rounded-xl border border-border bg-surface-secondary p-4">
        <p className="text-sm text-ink-muted">{t("recoverableRevenueLabel")}</p>
        <p className="text-2xl font-semibold text-ink">
          <Money value={current.recoverableRevenue} locale={locale} />
          {previous !== undefined && (
            <span className="ms-2 text-sm font-normal text-ink-muted">
              ({current.recoverableRevenue >= previous.recoverableRevenue ? "+" : ""}
              {formatCurrency(current.recoverableRevenue - previous.recoverableRevenue, locale)} {tAnalytics("vsPriorPeriod")})
            </span>
          )}
        </p>
        <p className="text-xs text-ink-muted">{t("abandonedCartCount", { count: current.abandonedCartCount })}</p>
      </div>
    </div>
  );
}
