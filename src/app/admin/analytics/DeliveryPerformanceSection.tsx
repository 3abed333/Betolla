import { getTranslations } from "next-intl/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@/components/ui";

type DeliveryPerformance = {
  leaderboard: {
    driverId: string;
    name: string;
    total: number;
    delivered: number;
    failed: number;
    failedRate: number;
    onTimeRate: number;
    avgDeliveryHours: number | null;
  }[];
  onTimeThresholdHours: number;
  problemBreakdown: { problemType: string; count: number }[];
};

function formatDelta(current: number, previous: number | undefined, suffix: string, unit = "") {
  if (previous === undefined) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.001) return null;
  const sign = delta > 0 ? "+" : "";
  return ` (${sign}${delta.toFixed(1)}${unit} ${suffix})`;
}

export async function DeliveryPerformanceSection({
  current,
  previous,
}: {
  current: DeliveryPerformance;
  previous?: DeliveryPerformance;
}) {
  const t = await getTranslations("admin.analytics.deliveryPerformance");
  const tAnalytics = await getTranslations("admin.analytics");
  const tProblemType = await getTranslations("common.deliveryProblemType");

  if (current.leaderboard.length === 0) {
    return <EmptyState title={t("noActivityTitle")} description={t("noActivityDescription")} />;
  }

  const previousByDriver = new Map(previous?.leaderboard.map((p) => [p.driverId, p]) ?? []);
  const vsPriorPeriod = tAnalytics("vsPriorPeriod");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-muted">{t("onTimeNote", { hours: current.onTimeThresholdHours })}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("headers.driver")}</TableHead>
            <TableHead>{t("headers.delivered")}</TableHead>
            <TableHead>{t("headers.failedRate")}</TableHead>
            <TableHead>{t("headers.onTimeRate")}</TableHead>
            <TableHead>{t("headers.avgDeliveryTime")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {current.leaderboard.map((d) => {
            const prev = previousByDriver.get(d.driverId);
            return (
              <TableRow key={d.driverId}>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.delivered}</TableCell>
                <TableCell>
                  {(d.failedRate * 100).toFixed(0)}%
                  {formatDelta(d.failedRate * 100, prev ? prev.failedRate * 100 : undefined, vsPriorPeriod, "pp")}
                </TableCell>
                <TableCell>
                  {(d.onTimeRate * 100).toFixed(0)}%
                  {formatDelta(d.onTimeRate * 100, prev ? prev.onTimeRate * 100 : undefined, vsPriorPeriod, "pp")}
                </TableCell>
                <TableCell>{d.avgDeliveryHours != null ? `${d.avgDeliveryHours.toFixed(1)}h` : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div>
        <p className="mb-2 text-sm font-medium text-ink">{t("failedReasonsTitle")}</p>
        {current.problemBreakdown.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("noProblemReports")}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-ink-muted">
            {current.problemBreakdown.map((p) => (
              <li key={p.problemType} className="flex justify-between">
                <span>{tProblemType.has(p.problemType) ? tProblemType(p.problemType) : p.problemType}</span>
                <span>{p.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
