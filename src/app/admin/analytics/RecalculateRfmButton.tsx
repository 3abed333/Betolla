"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

export function RecalculateRfmButton() {
  const router = useRouter();
  const t = useTranslations("admin.analytics.rfm.recalculate");
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    const res = await fetch("/api/admin/analytics/recompute-rfm", { method: "POST" });
    const data = await res.json();
    setRunning(false);
    if (!res.ok) {
      toast.error(t("couldntRecalculateTitle"), data.error);
      return;
    }
    toast.success(t("recalculated", { count: data.updated }));
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" onClick={run} disabled={running}>
      {running ? t("recalculating") : t("button")}
    </Button>
  );
}
