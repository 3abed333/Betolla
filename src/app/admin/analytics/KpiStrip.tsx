import { getTranslations, getLocale } from "next-intl/server";
import { formatCurrency } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";

type KpiValue = {
  labelKey: "totalRevenue" | "atRiskLostCustomers" | "openDeliveryTickets" | "recoverableCartRevenue";
  current: number;
  previous?: number;
  isCurrency: boolean;
  // Direction that counts as "good" when the value goes up. Revenue rising is good; recoverable
  // cart revenue rising is bad (more money stuck); the two count-only tiles have no delta at all
  // since they're point-in-time backlog snapshots, not period totals (see comment in page.tsx).
  goodDirection: "up" | "down" | null;
};

export async function KpiStrip({ values }: { values: KpiValue[] }) {
  const t = await getTranslations("admin.analytics.kpi");
  const tAnalytics = await getTranslations("admin.analytics");
  const locale = (await getLocale()) as AppLocale;
  const hasAnyComparison = values.some((v) => v.previous !== undefined);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {values.map((v) => {
          const delta = v.previous !== undefined ? v.current - v.previous : null;
          const deltaIsGood =
            delta === null || v.goodDirection === null || Math.abs(delta) < 0.005
              ? null
              : v.goodDirection === "up"
                ? delta > 0
                : delta < 0;
          const deltaColor = deltaIsGood === null ? "text-analytics-muted" : deltaIsGood ? "text-good" : "text-bad";
          const formattedValue = v.isCurrency ? formatCurrency(v.current, locale) : v.current.toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en");
          return (
            <div key={v.labelKey} className="rounded-md border border-analytics bg-analytics-surface px-3 py-2.5">
              <p className="text-xs text-analytics-muted">{t(v.labelKey)}</p>
              <p className="mt-0.5 text-xl font-semibold text-analytics">{formattedValue}</p>
              {delta !== null && Math.abs(delta) >= 0.005 && (
                <p className={`mt-0.5 text-xs font-medium ${deltaColor}`}>
                  {delta > 0 ? "+" : ""}
                  {v.isCurrency ? formatCurrency(delta, locale) : Math.round(delta).toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en")}{" "}
                  {tAnalytics("vsPriorPeriod")}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {!hasAnyComparison && <p className="text-xs text-analytics-muted">{t("noComparisonHint")}</p>}
    </div>
  );
}
