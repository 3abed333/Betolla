"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PROBLEM_TYPE_OPTIONS } from "@/lib/deliverySupport";

const STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function DeliverySupportFilters({ drivers }: { drivers: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("admin.deliverySupport.filters");
  const tProblemType = useTranslations("common.deliveryProblemType");
  const tStatus = useTranslations("common.ticketStatus");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={searchParams.get("driverId") ?? ""}
        onChange={(e) => setParam("driverId", e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
      >
        <option value="">{t("allDrivers")}</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("problemType") ?? ""}
        onChange={(e) => setParam("problemType", e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
      >
        <option value="">{t("allProblemTypes")}</option>
        {PROBLEM_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {tProblemType(option)}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
      >
        <option value="">{t("allStatuses")}</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {tStatus(s)}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={searchParams.get("from") ?? ""}
        onChange={(e) => setParam("from", e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
        aria-label={t("fromDateAriaLabel")}
      />
      <input
        type="date"
        value={searchParams.get("to") ?? ""}
        onChange={(e) => setParam("to", e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
        aria-label={t("toDateAriaLabel")}
      />
    </div>
  );
}
