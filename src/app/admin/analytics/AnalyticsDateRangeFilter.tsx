"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function AnalyticsDateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("admin.analytics.dateRangeFilter");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        {t("from")}
        <input
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        {t("to")}
        <input
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
        />
      </label>
    </div>
  );
}
