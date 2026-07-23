"use client";

import { useTranslations } from "next-intl";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SEGMENT_ORDER = ["CHAMPIONS", "LOYAL", "POTENTIAL_LOYALIST", "NEW_CUSTOMER", "NEEDS_ATTENTION", "AT_RISK", "LOST"] as const;
// Health-status mapping (not arbitrary categorical hues) - segments are an ordered spectrum
// from best to worst customer health, so color communicates that order rather than identity.
const SEGMENT_COLOR: Record<string, string> = {
  CHAMPIONS: "var(--success)",
  LOYAL: "var(--success)",
  POTENTIAL_LOYALIST: "var(--accent)",
  NEW_CUSTOMER: "var(--accent)",
  NEEDS_ATTENTION: "var(--highlight)",
  AT_RISK: "var(--critical)",
  LOST: "var(--critical)",
};

export function RfmSegmentChart({ counts }: { counts: Record<string, number> }) {
  const tSegment = useTranslations("common.rfmSegment");
  const tCommon = useTranslations("common");
  const data = SEGMENT_ORDER.map((segment) => ({
    segment,
    label: tSegment(segment),
    count: counts[segment] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
        <XAxis
          dataKey="label"
          angle={-35}
          textAnchor="end"
          interval={0}
          tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--surface-secondary)" }}
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--ink)" }}
          formatter={(value) => [tCommon("customersCount", { count: value as number }), ""]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.segment} fill={SEGMENT_COLOR[entry.segment]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
