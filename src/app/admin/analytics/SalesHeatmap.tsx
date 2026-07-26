import { getTranslations, getLocale } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";

type HeatmapGrid = { dayIndex: number; blocks: { key: string; count: number; revenue: number }[] }[];

// Jan 1, 2023 was a Sunday, so 2023-01-(1+dayIndex) walks Sun..Sat for dayIndex 0..6 - used purely
// as a stable reference date to let Intl.DateTimeFormat produce the locale-correct weekday name.
function weekdayLabel(dayIndex: number, locale: AppLocale) {
  return formatDate(new Date(2023, 0, 1 + dayIndex), locale, { weekday: "short" });
}

function totalOrders(grid: HeatmapGrid) {
  return grid.reduce((sum, row) => sum + row.blocks.reduce((s, b) => s + b.count, 0), 0);
}

export async function SalesHeatmap({ grid, previousGrid }: { grid: HeatmapGrid; previousGrid?: HeatmapGrid }) {
  const t = await getTranslations("admin.analytics.salesHeatmap");
  const tCommon = await getTranslations("common");
  const tAnalytics = await getTranslations("admin.analytics");
  const locale = (await getLocale()) as AppLocale;
  const maxRevenue = Math.max(1, ...grid.flatMap((row) => row.blocks.map((b) => b.revenue)));
  const blockKeys = grid[0]?.blocks.map((b) => b.key) ?? [];
  const current = totalOrders(grid);
  const previous = previousGrid ? totalOrders(previousGrid) : undefined;
  const delta = previous !== undefined ? current - previous : null;

  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-sm text-analytics-muted">
        {tCommon("ordersCount", { count: current })}
        {delta !== null && delta !== 0 && (
          <span className={delta > 0 ? "text-good" : "text-bad"}>
            {" "}
            ({delta > 0 ? "+" : ""}
            {delta} {tAnalytics("vsPriorPeriod")})
          </span>
        )}
      </p>
      <table className="w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="p-0.5 text-start text-analytics-muted"></th>
            {blockKeys.map((key) => (
              <th key={key} className="p-0.5 text-center font-normal text-analytics-muted">
                {t(`timeBlocks.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr key={row.dayIndex}>
              <td className="p-0.5 text-analytics-muted">{weekdayLabel(row.dayIndex, locale)}</td>
              {row.blocks.map((cell) => {
                const intensity = cell.revenue / maxRevenue;
                return (
                  <td key={cell.key} className="p-0">
                    <div
                      title={t("tooltip", {
                        weekday: weekdayLabel(row.dayIndex, locale),
                        block: t(`timeBlocks.${cell.key}`),
                        orderCount: tCommon("ordersCount", { count: cell.count }),
                        revenue: formatCurrency(cell.revenue, locale),
                      })}
                      className="flex h-8 w-full min-w-12 items-center justify-center rounded text-[11px] font-medium"
                      style={{
                        backgroundColor: intensity === 0 ? "var(--analytics-surface)" : "var(--analytics-neutral)",
                        opacity: intensity === 0 ? 1 : 0.25 + intensity * 0.75,
                        color: intensity > 0.5 ? "var(--analytics-bg)" : "var(--analytics-text-muted)",
                      }}
                    >
                      {cell.count > 0 ? cell.count : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-analytics-muted">{t("footnote")}</p>
    </div>
  );
}
