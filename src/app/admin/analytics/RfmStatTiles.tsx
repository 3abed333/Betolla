import { getTranslations } from "next-intl/server";

// Leads the RFM card with the 3 most actionable segment counts before the full distribution
// chart - Champions (protect/reward), At Risk + Lost (intervene) are the segments an admin would
// actually act on day-to-day, unlike the 4 "healthy middle" segments shown only in the chart below.
export async function RfmStatTiles({ counts }: { counts: Record<string, number> }) {
  const t = await getTranslations("admin.analytics.rfmStatTiles");

  const tiles = [
    { key: "champions" as const, count: counts.CHAMPIONS ?? 0, colorClass: "text-good" },
    { key: "atRisk" as const, count: counts.AT_RISK ?? 0, colorClass: "text-bad" },
    { key: "lost" as const, count: counts.LOST ?? 0, colorClass: "text-bad" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((tile) => (
        <div key={tile.key} className="rounded-md border border-analytics px-3 py-2">
          <p className="text-xs text-analytics-muted">{t(tile.key)}</p>
          <p className={`text-xl font-semibold ${tile.colorClass}`}>{tile.count}</p>
        </div>
      ))}
    </div>
  );
}
