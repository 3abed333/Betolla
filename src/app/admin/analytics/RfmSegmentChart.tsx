"use client";

import { useTranslations } from "next-intl";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

const SEGMENT_ORDER = ["CHAMPIONS", "LOYAL", "POTENTIAL_LOYALIST", "NEW_CUSTOMER", "NEEDS_ATTENTION", "AT_RISK", "LOST"] as const;
// Health-status mapping (not arbitrary categorical hues) - segments collapse onto the page's
// 3-color good/neutral/bad system: Champions/Loyal are healthy (good), Potential
// Loyalist/New Customer/Needs Attention are a "watch, no action yet" middle (neutral), and At
// Risk/Lost are the segments that need intervention (bad).
const SEGMENT_COLOR: Record<string, string> = {
  CHAMPIONS: "var(--analytics-good)",
  LOYAL: "var(--analytics-good)",
  POTENTIAL_LOYALIST: "var(--analytics-neutral)",
  NEW_CUSTOMER: "var(--analytics-neutral)",
  NEEDS_ATTENTION: "var(--analytics-neutral)",
  AT_RISK: "var(--analytics-bad)",
  LOST: "var(--analytics-bad)",
};

export function RfmSegmentChart({ counts }: { counts: Record<string, number> }) {
  const tSegment = useTranslations("common.rfmSegment");
  const t = useTranslations("admin.analytics.rfm");
  const data = SEGMENT_ORDER.map((segment) => ({
    segment,
    label: tSegment(segment),
    count: counts[segment] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 48 }}>
        <CartesianGrid vertical={false} stroke="var(--analytics-border)" strokeOpacity={0.6} />
        <XAxis
          dataKey="label"
          angle={-35}
          textAnchor="end"
          interval={0}
          tick={{ fill: "var(--analytics-text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--analytics-border)" }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fill: "var(--analytics-text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--analytics-surface)" }}
          contentStyle={{ background: "var(--analytics-bg)", border: "1px solid var(--analytics-border)", borderRadius: 8, color: "var(--analytics-text)" }}
          itemStyle={{ color: "var(--analytics-text)" }}
          labelStyle={{ color: "var(--analytics-text)" }}
          formatter={(value) => [value as number, t("customersLabel")]}
          wrapperStyle={{ zIndex: 50 }}
          allowEscapeViewBox={{ x: true, y: true }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.segment} fill={SEGMENT_COLOR[entry.segment]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
