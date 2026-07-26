import { getTranslations } from "next-intl/server";

type CohortData = { cohort: string; size: number; points: { offset: number; percent: number }[] }[];

export async function CohortRetentionHeatmap({ cohorts }: { cohorts: CohortData }) {
  const t = await getTranslations("admin.analytics.cohortRetention");

  if (cohorts.length === 0) {
    return <p className="text-sm text-analytics-muted">{t("noSignupsYet")}</p>;
  }

  const maxOffset = Math.max(...cohorts.flatMap((c) => c.points.map((p) => p.offset)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="p-1 text-start text-analytics-muted">{t("headers.cohort")}</th>
            <th className="p-1 text-start text-analytics-muted">{t("headers.size")}</th>
            {Array.from({ length: maxOffset + 1 }, (_, i) => (
              <th key={i} className="p-1 text-center font-normal text-analytics-muted">
                {t("monthOffsetHeader", { n: i })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((row) => (
            <tr key={row.cohort}>
              <td className="p-1 text-analytics-muted">{row.cohort}</td>
              <td className="p-1 text-analytics-muted">{row.size}</td>
              {row.points.map((point) => (
                <td key={point.offset} className="p-0">
                  <div
                    title={t("tooltip", { cohort: row.cohort, offset: point.offset, percent: (point.percent * 100).toFixed(0) })}
                    className="flex h-8 w-full min-w-12 items-center justify-center rounded text-[11px] font-medium"
                    style={{
                      backgroundColor: point.percent === 0 ? "var(--analytics-surface)" : "var(--analytics-neutral)",
                      opacity: point.percent === 0 ? 1 : 0.25 + point.percent * 0.75,
                      color: point.percent > 0.5 ? "var(--analytics-bg)" : "var(--analytics-text-muted)",
                    }}
                  >
                    {row.size > 0 ? `${(point.percent * 100).toFixed(0)}%` : ""}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-analytics-muted">{t("footnote")}</p>
    </div>
  );
}
