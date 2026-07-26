"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EmptyState } from "@/components/ui";

type StaffPerformance = {
  leaderboard: { staffId: string; name: string; count: number }[];
  timeline: { staffId: string; name: string; points: { date: string; count: number }[] }[];
};

export function StaffPerformanceChart({
  current,
  previous,
}: {
  current: StaffPerformance;
  previous?: StaffPerformance;
}) {
  const t = useTranslations("admin.analytics.staffPerformance");
  const tCommon = useTranslations("common");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(current.leaderboard[0]?.staffId ?? null);

  if (current.leaderboard.length === 0) {
    return <EmptyState title={t("noActivityTitle")} description={t("noActivityDescription")} />;
  }

  const previousCountById = new Map(previous?.leaderboard.map((p) => [p.staffId, p.count]) ?? []);
  const selected = current.timeline.find((ts) => ts.staffId === selectedStaffId);

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={current.leaderboard} margin={{ top: 8, right: 20, left: 0, bottom: 48 }}>
          <CartesianGrid vertical={false} stroke="var(--analytics-border)" strokeOpacity={0.6} />
          <XAxis
            dataKey="name"
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
            formatter={(value) => [value as number, t("ordersLabel")]}
            wrapperStyle={{ zIndex: 50 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Bar dataKey="count" fill="var(--analytics-neutral)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {current.leaderboard.map((s) => {
            const prevCount = previousCountById.get(s.staffId);
            const delta = prevCount !== undefined ? s.count - prevCount : null;
            return (
              <button
                key={s.staffId}
                type="button"
                onClick={() => setSelectedStaffId(s.staffId)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedStaffId === s.staffId
                    ? "border-neutral bg-neutral text-inverse"
                    : "border-analytics text-analytics-muted hover:bg-[var(--analytics-surface)]"
                }`}
              >
                {s.name} ({s.count}
                {delta !== null && (delta === 0 ? "" : delta > 0 ? `, +${delta}` : `, ${delta}`)})
              </button>
            );
          })}
        </div>
        {selected && selected.points.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={selected.points} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <XAxis dataKey="date" tick={{ fill: "var(--analytics-text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--analytics-border)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--analytics-text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--analytics-bg)", border: "1px solid var(--analytics-border)", borderRadius: 8, color: "var(--analytics-text)" }}
                itemStyle={{ color: "var(--analytics-text)" }}
                labelStyle={{ color: "var(--analytics-text)" }}
                formatter={(value) => [tCommon("ordersCount", { count: value as number }), selected.name]}
                wrapperStyle={{ zIndex: 50 }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              <Line type="monotone" dataKey="count" stroke="var(--analytics-neutral)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-analytics-muted">{t("noTimelineData")}</p>
        )}
      </div>
    </div>
  );
}
