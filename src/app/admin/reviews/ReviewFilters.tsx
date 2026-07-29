"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const STARS = [5, 4, 3, 2, 1];

export function ReviewFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("admin.reviews");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={searchParams.get("rating") ?? ""}
        onChange={(e) => setParam("rating", e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
        aria-label={t("filterStars")}
      >
        <option value="">{t("allStars")}</option>
        {STARS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
        aria-label={t("filterStatus")}
      >
        <option value="">{t("allStatuses")}</option>
        <option value="pending">{t("statusPending")}</option>
        <option value="published">{t("statusPublished")}</option>
      </select>
    </div>
  );
}
