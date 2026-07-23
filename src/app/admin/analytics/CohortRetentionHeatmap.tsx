import { getTranslations } from "next-intl/server";

type CohortData = { cohort: string; size: number; points: { offset: number; percent: number }[] }[];

export async function CohortRetentionHeatmap({ cohorts }: { cohorts: CohortData }) {
  const t = await getTranslations("admin.analytics.cohortRetention");

  if (cohorts.length === 0) {
    return <p className="text-sm text-ink-muted">{t("noSignupsYet")}</p>;
  }

  const maxOffset = Math.max(...cohorts.flatMap((c) => c.points.map((p) => p.offset)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="p-1 text-start text-ink-muted">{t("headers.cohort")}</th>
            <th className="p-1 text-start text-ink-muted">{t("headers.size")}</th>
            {Array.from({ length: maxOffset + 1 }, (_, i) => (
              <th key={i} className="p-1 text-center font-normal text-ink-muted">
                {t("monthOffsetHeader", { n: i })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((row) => (
            <tr key={row.cohort}>
              <td className="p-1 text-ink-muted">{row.cohort}</td>
              <td className="p-1 text-ink-muted">{row.size}</td>
              {row.points.map((point) => (
                <td key={point.offset} className="p-0">
                  <div
                    title={t("tooltip", { cohort: row.cohort, offset: point.offset, percent: (point.percent * 100).toFixed(0) })}
                    className="flex h-10 w-full min-w-14 items-center justify-center rounded-md text-[11px] font-medium"
                    style={{
                      backgroundColor: point.percent === 0 ? "var(--surface-secondary)" : "var(--cta)",
                      opacity: point.percent === 0 ? 1 : 0.25 + point.percent * 0.75,
                      color: point.percent > 0.5 ? "var(--cta-foreground)" : "var(--ink-muted)",
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
      <p className="mt-2 text-xs text-ink-muted">{t("footnote")}</p>
    </div>
  );
}
