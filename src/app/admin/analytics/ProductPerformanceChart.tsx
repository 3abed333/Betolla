"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";

type Row = { key: string; name: string; units: number; revenue: number; kind: "product" | "bundle" };

export function ProductPerformanceChart({ rows }: { rows: Row[] }) {
  const t = useTranslations("admin.analytics.productPerformance");
  const locale = useLocale() as AppLocale;
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 38)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--analytics-border)" />
        <XAxis type="number" tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} tickFormatter={(value) => value.length > 22 ? `${value.slice(0, 22)}…` : value} />
        <Tooltip contentStyle={{ background: "var(--analytics-bg)", border: "1px solid var(--analytics-border)", borderRadius: 8 }} formatter={(value, key) => key === "revenue" ? [formatCurrency(Number(value), locale), t("revenue")] : [Number(value), t("units")]} />
        <Bar dataKey="revenue" fill="var(--analytics-good)" radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
