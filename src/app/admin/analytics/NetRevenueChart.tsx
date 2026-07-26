"use client";

import { useTranslations, useLocale } from "next-intl";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/ui";
import { Money } from "@/components/Money";
import { formatCurrency } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";

type Point = { date: string; netRevenue: number };

function total(points: Point[]) {
  return points.reduce((sum, p) => sum + p.netRevenue, 0);
}

export function NetRevenueChart({ current, previous }: { current: Point[]; previous?: Point[] }) {
  const t = useTranslations("admin.analytics.netRevenue");
  const tAnalytics = useTranslations("admin.analytics");
  const locale = useLocale() as AppLocale;

  if (current.length === 0) {
    return <EmptyState title={t("noDataTitle")} />;
  }

  const currentTotal = total(current);
  const previousTotal = previous !== undefined ? total(previous) : undefined;
  const delta = previousTotal !== undefined ? currentTotal - previousTotal : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-analytics-muted">
        <Money value={currentTotal} locale={locale} />
        {delta !== null && Math.abs(delta) >= 0.005 && (
          <span className={delta > 0 ? "text-good" : "text-bad"}>
            {" "}
            ({delta > 0 ? "+" : ""}
            {formatCurrency(delta, locale)} {tAnalytics("vsPriorPeriod")})
          </span>
        )}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={current} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
          <XAxis dataKey="date" tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--analytics-border)" }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--analytics-text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--analytics-bg)", border: "1px solid var(--analytics-border)", borderRadius: 8, color: "var(--analytics-text)" }}
            itemStyle={{ color: "var(--analytics-text)" }}
            labelStyle={{ color: "var(--analytics-text)" }}
            formatter={(value) => [formatCurrency(value as number, locale), t("tooltipLabel")]}
            wrapperStyle={{ zIndex: 50 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Line type="monotone" dataKey="netRevenue" stroke="var(--analytics-neutral)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
