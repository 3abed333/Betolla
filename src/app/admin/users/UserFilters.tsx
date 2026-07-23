"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";

export function UserFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("admin.users.filters");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder={t("searchPlaceholder")}
        defaultValue={searchParams.get("q") ?? ""}
        onBlur={(e) => setParam("q", e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("q", e.currentTarget.value);
        }}
        className="h-10 w-72"
      />
      <select
        value={searchParams.get("sort") ?? "recent"}
        onChange={(e) => setParam("sort", e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink"
      >
        <option value="recent">{t("sortRecent")}</option>
        <option value="spend">{t("sortSpend")}</option>
        <option value="orders">{t("sortOrders")}</option>
      </select>
    </div>
  );
}
