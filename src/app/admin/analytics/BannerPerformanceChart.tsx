"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

type Row = { id: string; titleEn: string; titleAr: string; impressions: number; clicks: number; ctr: number };

export function BannerPerformanceChart({ rows }: { rows: Row[] }) {
  const t = useTranslations("admin.analytics.bannerPerformance");
  const locale = useLocale() as AppLocale;
  if (rows.length === 0) return <EmptyState title={t("noData")} />;
  const data = rows.map((row) => ({ ...row, name: localizedField(locale, row.titleEn, row.titleAr) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 12, right: 20, bottom: 18, left: 0 }}>
        <CartesianGrid stroke="var(--analytics-border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} interval={0} tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}…` : value} />
        <YAxis yAxisId="count" allowDecimals={false} tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} />
        <YAxis yAxisId="percent" orientation="right" unit="%" tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "var(--analytics-bg)", border: "1px solid var(--analytics-border)", borderRadius: 8 }} formatter={(value, key) => key === "ctr" ? [`${Number(value).toFixed(1)}%`, t("ctr")] : [Number(value), t(key as "impressions" | "clicks")]} />
        <Legend formatter={(value) => t(value as "impressions" | "clicks" | "ctr")} />
        <Bar yAxisId="count" dataKey="impressions" fill="var(--analytics-neutral)" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="count" dataKey="clicks" fill="var(--analytics-good)" radius={[4, 4, 0, 0]} />
        <Line yAxisId="percent" type="monotone" dataKey="ctr" stroke="var(--analytics-comparison)" strokeWidth={3} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
