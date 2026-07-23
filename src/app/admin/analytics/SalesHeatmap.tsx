import { getTranslations, getLocale } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";

type HeatmapGrid = { dayIndex: number; blocks: { key: string; count: number; revenue: number }[] }[];

// Jan 1, 2023 was a Sunday, so 2023-01-(1+dayIndex) walks Sun..Sat for dayIndex 0..6 - used purely
// as a stable reference date to let Intl.DateTimeFormat produce the locale-correct weekday name.
function weekdayLabel(dayIndex: number, locale: AppLocale) {
  return formatDate(new Date(2023, 0, 1 + dayIndex), locale, { weekday: "short" });
}

export async function SalesHeatmap({ grid }: { grid: HeatmapGrid }) {
  const t = await getTranslations("admin.analytics.salesHeatmap");
  const tOrdersCount = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;
  const maxRevenue = Math.max(1, ...grid.flatMap((row) => row.blocks.map((b) => b.revenue)));
  const blockKeys = grid[0]?.blocks.map((b) => b.key) ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="p-1 text-start text-ink-muted"></th>
            {blockKeys.map((key) => (
              <th key={key} className="p-1 text-center font-normal text-ink-muted">
                {t(`timeBlocks.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr key={row.dayIndex}>
              <td className="p-1 text-ink-muted">{weekdayLabel(row.dayIndex, locale)}</td>
              {row.blocks.map((cell) => {
                const intensity = cell.revenue / maxRevenue;
                return (
                  <td key={cell.key} className="p-0">
                    <div
                      title={t("tooltip", {
                        weekday: weekdayLabel(row.dayIndex, locale),
                        block: t(`timeBlocks.${cell.key}`),
                        orderCount: tOrdersCount("ordersCount", { count: cell.count }),
                        revenue: formatCurrency(cell.revenue, locale),
                      })}
                      className="flex h-10 w-full min-w-14 items-center justify-center rounded-md text-[11px] font-medium"
                      style={{
                        backgroundColor: intensity === 0 ? "var(--surface-secondary)" : "var(--cta)",
                        opacity: intensity === 0 ? 1 : 0.25 + intensity * 0.75,
                        color: intensity > 0.5 ? "var(--cta-foreground)" : "var(--ink-muted)",
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
      <p className="mt-2 text-xs text-ink-muted">{t("footnote")}</p>
    </div>
  );
}
